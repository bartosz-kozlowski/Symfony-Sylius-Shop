<?php

namespace App\Controller;

use Doctrine\ORM\EntityManagerInterface;
use Sylius\Bundle\CoreBundle\Doctrine\ORM\ProductRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

class CanvasColorController extends AbstractController
{
    #[Route('/admin/3d-canvas/set-color', name: 'admin_3d_canvas_set_color', methods: ['POST'])]
    public function setColor(Request $request, ProductRepository $productRepository, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        if (!isset($data['code'], $data['color'])) {
            return new JsonResponse(['error' => 'Invalid data'], 400);
        }

        $product = $productRepository->findOneBy(['code' => $data['code']]);

        if (!$product) {
            return new JsonResponse(['error' => 'Product not found'], 404);
        }

        $product->setModelColor($data['color']);
        $em->persist($product);
        $em->flush();

        return new JsonResponse(['success' => true, 'color' => $data['color']]);
    }
    #[Route('/admin/3d-canvas/get-color/{code}', name: 'admin_3d_canvas_get_color', methods: ['GET'])]
    public function getColor(string $code, ProductRepository $productRepository): JsonResponse
    {
        $product = $productRepository->findOneBy(['code' => $code]);

        if (!$product) {
            return new JsonResponse(['error' => 'Product not found'], 404);
        }

        return new JsonResponse(['color' => $product->getModelColor()]);
    }
}

