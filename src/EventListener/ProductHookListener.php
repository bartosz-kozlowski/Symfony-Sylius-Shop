<?php
namespace App\EventListener;

use Sylius\Bundle\UiBundle\Hook\HookEvent;
use Sylius\Component\Core\Repository\ProductRepositoryInterface;

final class ProductHookListener
{
public function __construct(private ProductRepositoryInterface $productRepository) {}

public function __invoke(HookEvent $event): void
{
$products = $this->productRepository->findAll(); // lub np. getLatest()
$event->addContext('products', $products);
}
}
