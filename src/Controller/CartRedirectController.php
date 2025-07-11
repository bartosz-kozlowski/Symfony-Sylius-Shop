<?php

declare(strict_types=1);

namespace App\Controller;

use Doctrine\ORM\EntityManagerInterface;
use Sylius\Bundle\CoreBundle\Provider\FlashBagProvider;
use Sylius\Bundle\OrderBundle\Factory\AddToCartCommandFactoryInterface;
use Sylius\Component\Core\Factory\CartItemFactoryInterface;
use Sylius\Component\Core\Model\ProductVariant;
use Sylius\Component\Core\Repository\ProductVariantRepositoryInterface;
use Sylius\Component\Order\Context\CartContextInterface;
use Sylius\Component\Order\Modifier\OrderItemQuantityModifierInterface;
use Sylius\Component\Order\SyliusCartEvents;
use Symfony\Component\EventDispatcher\EventDispatcherInterface;
use Symfony\Component\EventDispatcher\GenericEvent;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Routing\RouterInterface;


#[Route('/custom-add-to-cart', name: 'custom_add_to_cart')]
final class CartRedirectController
{
    public function __construct(
        private readonly CartContextInterface                 $cartContext,
        private readonly AddToCartCommandFactoryInterface     $addToCartCommandFactory,
        private readonly CartItemFactoryInterface             $cartItemFactory,
        private readonly ProductVariantRepositoryInterface    $variantRepository,
        private readonly OrderItemQuantityModifierInterface $itemQuantityModifier,
        private readonly EventDispatcherInterface             $eventDispatcher,
        private readonly EntityManagerInterface               $entityManager,
        private readonly RouterInterface                      $router,
        private readonly RequestStack                         $requestStack,
    ) {
    }

    #[Route('/{productVariant}', methods: ['GET'], requirements: ['productVariant' => '\d+'], defaults: ['productVariant' => null])]
    public function __invoke(?ProductVariant $productVariant, Request $request): RedirectResponse
    {
        if (null !== $productVariant) {
            $this->addVariantToCart($productVariant);
        }

        if ($request->query->has('cart')) {
            $this->addStackedItems($request->query->get('cart'));
        }

        // flash „Dodano do koszyka”
        FlashBagProvider::getFlashBag($this->requestStack)
            ->add('success', 'sylius.cart.add_item');

        return new RedirectResponse($this->router->generate('sylius_shop_cart_summary'));
    }

    private function addVariantToCart(ProductVariant $variant, int $quantity = 1): void
    {
        // tworzymy CartItem dla produktu i przypisujemy konkretny wariant
        $cartItem = $this->cartItemFactory->createForProduct($variant->getProduct());
        $cartItem->setVariant($variant);
        $this->itemQuantityModifier->modify($cartItem, $quantity);

        // komenda AddToCart bez żadnego formularza
        $command = $this->addToCartCommandFactory->createWithCartAndCartItem(
            $this->cartContext->getCart(),
            $cartItem,
        );

        $this->dispatchAndFlush($command);
    }

    private function addStackedItems(string $base64Payload): void
    {
        $decoded = base64_decode($base64Payload, true);
        if (false === $decoded) {
            throw new \RuntimeException('Nieprawidłowa zawartość parametru "cart".');
        }

        $items = json_decode(urldecode($decoded), true, 512, \JSON_THROW_ON_ERROR);

        foreach ($items as $row) {
            if (!isset($row['variantCode'])) {
                continue;
            }

            $variant = $this->variantRepository->findOneBy(['code' => $row['variantCode']]);
            if (null === $variant) {
                continue;
            }

            $this->addVariantToCart($variant, (int) ($row['quantity'] ?? 1));
        }
    }

    private function dispatchAndFlush(object $addToCartCommand): void
    {
        $this->eventDispatcher->dispatch(
            new GenericEvent($addToCartCommand),
            SyliusCartEvents::CART_ITEM_ADD,
        );

        // zapis koszyka
        $this->entityManager->persist($addToCartCommand->getCart());
        $this->entityManager->flush();
    }
}
