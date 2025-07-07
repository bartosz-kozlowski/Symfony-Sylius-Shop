<?php
namespace App\Form\Extension;

use Symfony\Component\Form\Extension\Core\Type\IntegerType;
use Symfony\Component\Form\AbstractTypeExtension;
use Symfony\Component\Form\Extension\Core\Type\HiddenType;
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\Form\FormEvent;
use Symfony\Component\Form\FormEvents;
use Symfony\Component\Form\Extension\Core\Type\FileType;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Sylius\Bundle\AdminBundle\Form\Type\ProductType;
use Symfony\Component\Validator\Constraints\File;

final class ProductTypeExtension extends AbstractTypeExtension
{
    public function __construct(private readonly string $projectDir) {}

    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('threeDModel', FileType::class, [
                'label'    => 'Model 3D',
                'required' => false,
                'mapped'   => false,
                'constraints' => [ new File(['mimeTypes' => ['model/gltf+json', 'model/gltf+xml', 'model/gltf+yaml',
                    'model/gltf', 'model/gltf-binary',],
                    'mimeTypesMessage' => 'Dozwolone są tylko pliki GLB lub GLTF.',]) ],
            ])
            ->add('removeThreeDModel', HiddenType::class, [
                'mapped' => false,
                'required' => false,
                'attr' => ['data-remove-model' => ''],
            ])
            ->add('model3dPosition', IntegerType::class, [
                'label' => 'Pozycja modelu 3D',
                'required' => false,
            ])
            ->addEventListener(FormEvents::POST_SUBMIT, function (FormEvent $event) {
                $form    = $event->getForm();
                $product = $event->getData();

                /** @var bool|string $remove */
                $remove = $form->has('removeThreeDModel') ? $form->get('removeThreeDModel')->getData() : false;

                if ($remove && $product->getModel3dPath()) {
                    $absolutePath = $this->projectDir . '/public' . $product->getModel3dPath();
                    if (file_exists($absolutePath)) {
                        unlink($absolutePath);
                    }
                    $product->setModel3dPath(null);
                }

                /** @var UploadedFile|null $file */
                $file = $form->get('threeDModel')->getData();
                if ($file !== null){
                    $extension = strtolower($file->getClientOriginalExtension());
                    if (!in_array($extension, ['glb', 'gltf'])) {
                        $form->get('threeDModel')->addError(new \Symfony\Component\Form\FormError('Dozwolone są tylko pliki .glb i .gltf.'));
                        return;
                    }
                    if ($file instanceof UploadedFile) {
                        $destination = $this->projectDir . '/public/media/models';
                        if (!is_dir($destination)
                            && !mkdir($destination, 0777, true)
                            && !is_dir($destination)) {
                            throw new \RuntimeException(
                                sprintf('Nie mogę utworzyć katalogu "%s"', $destination)
                            );
                        }

                        $filename = uniqid('', true) . '.' . $file->guessExtension();
                        $file->move($destination, $filename);
                        $product->setModel3dPath('/media/models/' . $filename);
                    }
                }
            });
    }

    public static function getExtendedTypes(): iterable
    {
        return [ProductType::class];
    }
}
