<?php

namespace App\Controller;

use Sylius\Component\Product\Repository\ProductRepositoryInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\HttpFoundation\Request;

final class CanvController extends AbstractController
{
    #[Route('/admin/3d-canvas', name: 'admin_3d_canvas')]
    public function index(Request $request, ProductRepositoryInterface $productRepository): Response
    {
        $criteria = $request->query->all('criteria');

        $nameValue = $criteria['name']['value'] ?? null;
        $nameType = $criteria['name']['type'] ?? 'contains';

        $codeValue = $criteria['code']['value'] ?? null;
        $codeType = $criteria['code']['type'] ?? 'contains';

        $queryBuilder = $productRepository->createQueryBuilder('p')
            ->leftJoin('p.translations', 't')
            ->addSelect('t')
            ->andWhere('p.model3dPath IS NOT NULL');

        // NAME FILTER
        if ($nameValue !== null && $nameValue !== '') {
            switch ($nameType) {
                case 'not_contains':
                    $queryBuilder->andWhere('t.name NOT LIKE :name');
                    $queryBuilder->setParameter('name', '%' . $nameValue . '%');
                    break;
                case 'equal':
                    $queryBuilder->andWhere('t.name = :name');
                    $queryBuilder->setParameter('name', $nameValue);
                    break;
                case 'not_equal':
                    $queryBuilder->andWhere('t.name != :name');
                    $queryBuilder->setParameter('name', $nameValue);
                    break;
                case 'starts_with':
                    $queryBuilder->andWhere('t.name LIKE :name');
                    $queryBuilder->setParameter('name', $nameValue . '%');
                    break;
                case 'ends_with':
                    $queryBuilder->andWhere('t.name LIKE :name');
                    $queryBuilder->setParameter('name', '%' . $nameValue);
                    break;
                case 'empty':
                    $queryBuilder->andWhere('t.name IS NULL OR t.name = \'\'');
                    break;
                case 'not_empty':
                    $queryBuilder->andWhere('t.name IS NOT NULL AND t.name != \'\'');
                    break;
                case 'contains':
                default:
                    $queryBuilder->andWhere('t.name LIKE :name');
                    $queryBuilder->setParameter('name', '%' . $nameValue . '%');
                    break;
            }
        }

        // CODE FILTER
        if ($codeValue !== null && $codeValue !== '') {
            switch ($codeType) {
                case 'not_contains':
                    $queryBuilder->andWhere('p.code NOT LIKE :code');
                    $queryBuilder->setParameter('code', '%' . $codeValue . '%');
                    break;
                case 'equal':
                    $queryBuilder->andWhere('p.code = :code');
                    $queryBuilder->setParameter('code', $codeValue);
                    break;
                case 'not_equal':
                    $queryBuilder->andWhere('p.code != :code');
                    $queryBuilder->setParameter('code', $codeValue);
                    break;
                case 'starts_with':
                    $queryBuilder->andWhere('p.code LIKE :code');
                    $queryBuilder->setParameter('code', $codeValue . '%');
                    break;
                case 'ends_with':
                    $queryBuilder->andWhere('p.code LIKE :code');
                    $queryBuilder->setParameter('code', '%' . $codeValue);
                    break;
                case 'empty':
                    $queryBuilder->andWhere('p.code IS NULL OR p.code = \'\'');
                    break;
                case 'not_empty':
                    $queryBuilder->andWhere('p.code IS NOT NULL AND p.code != \'\'');
                    break;
                case 'contains':
                default:
                    $queryBuilder->andWhere('p.code LIKE :code');
                    $queryBuilder->setParameter('code', '%' . $codeValue . '%');
                    break;
            }
        }

        $products = $queryBuilder->getQuery()->getResult();
        return $this->render('admin/3d_canvas/redirect.html.twig', [
            'products' => $products,
        ]);
    }
}
