<?php

namespace App\Form\Extension;

use Symfony\Component\Form\AbstractTypeExtension;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\Form\Extension\Core\Type\TextType;
use Symfony\Component\Form\Extension\Core\Type\ColorType;
use Sylius\Bundle\AdminBundle\Form\Type\ProductVariantType;
use Symfony\Component\Form\Extension\Core\Type\ChoiceType;
use Symfony\Component\Finder\Finder;
use Symfony\Component\Form\Extension\Core\Type\FileType;
use Symfony\Component\Validator\Constraints\File;
use Symfony\Component\HttpFoundation\File\UploadedFile;

class ProductVariantTypeExtension extends AbstractTypeExtension
{
    public static function getExtendedTypes(): iterable
    {
        return [ProductVariantType::class];
    }

    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $modelsDir = __DIR__ . '/../../../public/media/models';
        $finder = new Finder();
        $finder->files()->in($modelsDir)->name('*.glb');

        $choices = [];
        foreach ($finder as $file) {
            $relativePath = '/media/models/' . $file->getFilename();
            $choices[$file->getFilename()] = $relativePath;
        }

        $builder
            ->add('modelColor', ColorType::class, [
                'required' => false,
                'label' => 'Kolor wariantu',
            ])
            ->add('model3dPath', FileType::class, [
                'label' => 'Upload modelu 3D (GLB/GLTF)',
                'required' => false,
                'mapped' => false,
                'constraints' => [
                    new File([
                        'mimeTypes' => [
                            'model/gltf+json', 'model/gltf+xml', 'model/gltf',
                            'model/gltf-binary', 'application/octet-stream'
                        ],
                        'mimeTypesMessage' => 'Dozwolone są tylko pliki GLB lub GLTF.',
                    ])
                ],
            ]);
    }
}
