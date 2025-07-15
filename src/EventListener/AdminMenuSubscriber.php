<?php

namespace App\EventListener;

use Sylius\Bundle\UiBundle\Menu\Event\MenuBuilderEvent;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;

final class AdminMenuSubscriber implements EventSubscriberInterface
{
    public static function getSubscribedEvents(): array
    {
        return [
            'sylius.menu.admin.main' => 'onMenuBuild',
        ];
    }

    public function onMenuBuild(MenuBuilderEvent $event): void
    {
        $menu = $event->getMenu();

        $catalog = $menu->getChild('catalog');

        if ($catalog !== null) {
            $catalog
                ->addChild('admin_3d_canvas', [
                    'route' => 'admin_3d_canvas',
                ])
                ->setLabel('app.admin.menu.3d_canvas_overview')
                ->setLabelAttribute('icon', 'cube');
        }
    }
}
