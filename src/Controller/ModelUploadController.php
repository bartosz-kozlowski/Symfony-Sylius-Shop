<?php

namespace App\Controller;

use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class ModelUploadController
{
    #[Route('/api/upload-model', name: 'api_upload_model', methods: ['POST'])]
    public function __invoke(Request $request): Response
    {
        $file = $request->files->get('file');

        if (!$file) {
            return new JsonResponse(['error' => 'Brak pliku'], Response::HTTP_BAD_REQUEST);
        }

        $originalFilename = $request->request->get('filename');
        dump($originalFilename);

        $uploadDir = __DIR__ . '/../../../public/media/models';

        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0777, true);
        }

        $file->move($uploadDir, $originalFilename);

        return new JsonResponse([
            'success' => true,
            'path' => '/media/models/' . $originalFilename
        ]);
    }
}
