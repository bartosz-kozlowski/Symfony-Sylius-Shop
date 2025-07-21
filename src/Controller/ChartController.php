<?php

declare(strict_types=1);

namespace App\Controller;

use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;

class ChartController extends AbstractController
{
    #[Route('/admin/product-visit-data', name: 'admin_product_visit_data')]
    public function productVisitData(EntityManagerInterface $em): JsonResponse
    {
        $conn = $em->getConnection();
        $sql = "
            SELECT path, COUNT(*) as count
            FROM Click
            WHERE element = 'PAGELOAD' AND path LIKE '%/products/%'
            GROUP BY path
            ORDER BY count DESC
            LIMIT 10
        ";

        $results = $conn->executeQuery($sql)->fetchAllAssociative();

        return new JsonResponse([
            'labels' => array_column($results, 'path'),
            'counts' => array_map('intval', array_column($results, 'count')),
        ]);
    }
}
