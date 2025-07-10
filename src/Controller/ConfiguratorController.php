<?php

namespace App\Controller;

use Sylius\Component\Core\Repository\ProductRepositoryInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

final class ConfiguratorController extends AbstractController
{
    public function __construct(
        private ProductRepositoryInterface $productRepository,
    ) {}

    #[Route('pl_PL/taxons/panel-konfiguracji', name: 'panel-konfiguracji')]
    public function index(): Response
    {
        $queryBuilder = $this->productRepository->createQueryBuilder('p')
            ->leftJoin('p.translations', 't')
            ->addSelect('t')
            ->andWhere('p.enabled = true')
            ->andWhere('p.model3dPath IS NOT NULL');

        $products = $queryBuilder->getQuery()->getResult();

        return $this->render('shop/config.html.twig', [
            'products' => $products,
        ]);
    }
}
