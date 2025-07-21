<?php
declare(strict_types=1);

namespace App\Controller;

use App\Entity\Tracking\Click;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Annotation\Route;

class ClickTrackerController
{
    #[Route('/click-tracker', name: 'click_tracker', methods: ['POST'])]
    public function track(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        $click = new Click();
        $click->setX($data['x']);
        $click->setY($data['y']);
        $click->setPath($data['path']);
        $click->setTimestamp(new \DateTime());
        $click->setElement($data['element']);

        $em->persist($click);
        $em->flush();

        return new JsonResponse(['status' => 'ok']);
    }
}
