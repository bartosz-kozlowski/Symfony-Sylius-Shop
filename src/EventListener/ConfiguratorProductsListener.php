<?php

namespace App\EventListener;

use Sylius\Component\Core\Repository\ProductRepositoryInterface;
use Sylius\Bundle\UiBundle\Layout\LayoutEvent;

final class ConfiguratorProductsListener
{
    public function __construct(private ProductRepositoryInterface $productRepository) {}

    public function addProducts(LayoutEvent $event): void
    {
        $products = $this->productRepository->createQueryBuilder('p')
            ->leftJoin('p.translations', 't')
            ->addSelect('t')
            ->andWhere('p.enabled = true')
            ->andWhere('p.model3dPath IS NOT NULL')
            ->getQuery()
            ->getResult();

        $event->addContext('products', $products);
    }
}
