<?php

namespace App\Controller;

use Sylius\Bundle\CoreBundle\Doctrine\ORM\ProductRepository;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\DependencyInjection\ParameterBag\ParameterBagInterface;

class ModelUploadController
{
    private string $projectDir;

    public function __construct(ParameterBagInterface $params)
    {
        $this->projectDir = $params->get('kernel.project_dir');
    }

    #[Route('/admin/3d-canvas/upload-model/{code}', name: 'admin_3d_canvas_upload_model', methods: ['POST'])]
    public function uploadModel(Request $request, string $code, ProductRepository $productRepository): JsonResponse
    {
        $file = $request->files->get('model');
        if (!$file || !$file->isValid()) {
            return new JsonResponse(['error' => 'Nieprawidłowy plik'], 400);
        }

        $product = $productRepository->findOneBy(['code' => $code]);
        if (!$product) {
            return new JsonResponse(['error' => 'Nie znaleziono produktu'], 404);
        }

        $targetDir = $this->projectDir . '/public/media/models';
        if (!is_dir($targetDir)) {
            mkdir($targetDir, 0775, true);
        }

        $targetPath = $targetDir . '/' . $code . '.glb';
        $file->move($targetDir, $code . '.glb');

        $modelRelativePath = '/media/models/' . $code . '.glb';
        $product->setModel3dPath($modelRelativePath);
        $productRepository->add($product, true);

        return new JsonResponse([
            'status' => 'OK',
            'modelPath' => $modelRelativePath,
        ]);
    }
}
