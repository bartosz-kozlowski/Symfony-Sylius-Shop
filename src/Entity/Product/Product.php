<?php

declare(strict_types=1);

namespace App\Entity\Product;

use Doctrine\ORM\Mapping as ORM;
use Sylius\Component\Core\Model\Product as BaseProduct;
use Sylius\Component\Product\Model\ProductTranslationInterface;
use Sylius\MolliePlugin\Entity\ProductInterface;
use Sylius\MolliePlugin\Entity\ProductTrait;

#[ORM\Entity]
#[ORM\Table(name: 'sylius_product')]
class Product extends BaseProduct implements ProductInterface
{
    use ProductTrait;

    #[ORM\Column(type: 'string', nullable: true)]
    private ?string $model3dPath = null;

    public function getModel3dPath(): ?string
    {
        return $this->model3dPath;
    }

    public function setModel3dPath(?string $model3dPath): void
    {
        $this->model3dPath = $model3dPath;
    }

    #[ORM\Column(type: 'float', nullable: true)]
    private ?float $weight = null;

    public function setWeight(?float $weight): void{
        $this->weight=$weight;
    }

    public function getWeight(): ?float{
        return $this->weight;
    }

    private $threeDModel;

    public function getThreeDModel()
    {
        return $this->threeDModel;
    }

    public function setThreeDModel($threeDModel): void
    {
        $this->threeDModel = $threeDModel;
    }

    #[ORM\Column(type: 'integer', nullable: true)]
    private ?int $model3dPosition = null;

    public function getModel3dPosition(): ?int
    {
        return $this->model3dPosition;
    }

    public function setModel3dPosition(?int $position): void
    {
        $this->model3dPosition = $position;
    }


    protected function createTranslation(): ProductTranslationInterface
    {
        return new ProductTranslation();
    }
}
