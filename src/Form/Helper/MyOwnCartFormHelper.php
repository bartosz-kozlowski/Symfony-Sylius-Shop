<?php

namespace App\Form\Helper;

use Symfony\Component\Form\FormFactoryInterface;
use Symfony\Component\Form\FormView;
use Sylius\Component\Order\Context\CartContextInterface;
use Sylius\Component\Resource\Factory\FactoryInterface;
use Sylius\Bundle\OrderBundle\Factory\AddToCartCommandFactoryInterface;
use Sylius\Bundle\CoreBundle\Form\Type\Order\AddToCartType;
use Sylius\Component\Core\Model\ProductInterface;
use Sylius\Component\Core\Model\ProductVariantInterface;

class MyOwnCartFormHelper
{
    private FactoryInterface $orderItemFactory;
    private AddToCartCommandFactoryInterface $addToCartCommandFactory;
    private FormFactoryInterface $formFactory;
    private CartContextInterface $cartContext;

    public function __construct(
        CartContextInterface $cartContext,
        FactoryInterface $orderItemFactory,
        FormFactoryInterface $formFactory,
        AddToCartCommandFactoryInterface $addToCartCommandFactory
    ) {
        $this->orderItemFactory = $orderItemFactory;
        $this->addToCartCommandFactory = $addToCartCommandFactory;
        $this->formFactory = $formFactory;
        $this->cartContext = $cartContext;
    }

    public function getItemFormView(ProductInterface $product, array $options = []): FormView
    {
        $cartItem = $this->orderItemFactory->createNew();
        $variant = $product->getVariants()->first();

        if (!$variant instanceof ProductVariantInterface) {
            throw new \LogicException('Product has no variant');
        }

        $cartItem->setVariant($variant);
//        $cartItem->setQuantity(1);

        $form = $this->formFactory->create(
            AddToCartType::class,
            $this->addToCartCommandFactory->createWithCartAndCartItem(
                $this->cartContext->getCart(),
                $cartItem
            ),
            array_merge(['product' => $product], $options)
        );
        dump($form);
        dump($cartItem);

        return $form->createView();
    }
}
