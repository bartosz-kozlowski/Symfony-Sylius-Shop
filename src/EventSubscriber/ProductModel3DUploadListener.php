<?php
namespace App\EventSubscriber;

use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\Form\FormEvent;
use Symfony\Component\Form\FormEvents;
use Symfony\Component\HttpFoundation\File\UploadedFile;

class ProductModel3DUploadListener implements EventSubscriberInterface
{
    public static function getSubscribedEvents(): array
    {
        return [
            FormEvents::POST_SUBMIT => 'onPostSubmit',
        ];
    }

    public function onPostSubmit(FormEvent $event): void
    {
//        $form    = $event->getForm();
//        $product = $event->getData();
//
//        if (!$form->has('threeDModel')) {
//            return;
//        }
//
//        /** @var UploadedFile|null $file */
//        $file = $form->get('threeDModel')->getData();
//
//        if ($file instanceof UploadedFile) {
//            $filename    = uniqid('', true) . '.' . $file->guessExtension();
//            $destination = $event
//                    ->getForm()
//                    ->getConfig()
//                    ->getOption('kernel.project_dir') . '/public/media/models';
//
//            if (!is_dir($destination) && !mkdir($destination, 0777, true) && !is_dir($destination)) {
//                throw new \RuntimeException(sprintf('Nie udało się utworzyć katalogu %s', $destination));
//            }
//
//            $file->move($destination, $filename);
//            $product->setModel3dPath('/media/models/' . $filename);
       // }
    }
}
