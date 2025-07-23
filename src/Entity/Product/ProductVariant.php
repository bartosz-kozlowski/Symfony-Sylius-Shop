<?php

declare(strict_types=1);

namespace App\Entity\Product;

use Doctrine\ORM\Mapping as ORM;
use Sylius\Component\Core\Model\ProductVariant as BaseProductVariant;
use Sylius\Component\Product\Model\ProductVariantTranslationInterface;
use Sylius\MolliePlugin\Entity\ProductVariantInterface;
use Sylius\MolliePlugin\Entity\RecurringProductVariantTrait;

#[ORM\Entity]
#[ORM\Table(name: 'sylius_product_variant')]
class ProductVariant extends BaseProductVariant implements ProductVariantInterface
{
    use RecurringProductVariantTrait;
    #[ORM\Column(type: 'string', nullable: true)]
    private ?string $model3dPath = null;

    #[ORM\Column(type: 'string', length: 7, nullable: true)]
    private ?string $modelColor = null;

    public function getModel3dPath(): ?string
    {
        return $this->model3dPath;
    }

    public function setModel3dPath(?string $model3dPath): void
    {
        $this->model3dPath = $model3dPath;
    }

    public function getModelColor(): ?string
    {
        return $this->modelColor;
    }

    public function setModelColor(?string $modelColor): void
    {
        $this->modelColor = $modelColor;
    }


    protected function createTranslation(): ProductVariantTranslationInterface
    {
        return new ProductVariantTranslation();
    }
}
