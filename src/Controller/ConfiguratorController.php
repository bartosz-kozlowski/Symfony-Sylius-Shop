<?php

namespace App\Controller;

use Sylius\Component\Core\Repository\ProductRepositoryInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Knp\Component\Pager\PaginatorInterface;
use Symfony\Component\HttpFoundation\Request;

final class ConfiguratorController extends AbstractController
{
    public function __construct(
        private ProductRepositoryInterface $productRepository,
        private PaginatorInterface $paginator
    ) {}

    #[Route('pl_PL/taxons/panel-konfiguracji', name: 'panel-konfiguracji')]
    public function index(Request $request): Response
    {
        $queryBuilder = $this->productRepository->createQueryBuilder('p')
            ->leftJoin('p.translations', 't')
            ->addSelect('t')
            ->andWhere('p.enabled = true')
            ->andWhere('p.model3dPath IS NOT NULL');

        $pagination = $this->paginator->paginate(
            $queryBuilder,
            $request->query->getInt('page', 1),
            10 // liczba produktów na stronę
        );

        $frameId = $request->headers->get('Turbo-Frame');   // null lub np. 'productListFrame'
        if ($frameId === 'productListFrame') {
            return $this->render('shop/_products_list.html.twig', [
                'products' => $pagination,
            ]);
        }

//        if ($request->headers->get('Turbo-Frame') === 'productListFrame') {
//            return $this->render('shop/_products_list.html.twig', [
//                'products' => $pagination,
//            ]);
//        }

        return $this->render('shop/config.html.twig', [
            'products' => $pagination,
        ]);
    }

}
