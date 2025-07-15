<?php

declare(strict_types=1);

use Rector\Config\RectorConfig;
use Sylius\SyliusRector\Set\SyliusMollie;

return static function (RectorConfig $rectorConfig): void {
    $rectorConfig->importNames();
    $rectorConfig->removeUnusedImports();
    $rectorConfig->sets([SyliusMollie::MOLLIE_PLUGIN_30]);
    $rectorConfig->import(__DIR__ . '/vendor/sylius/sylius-rector/config/config.php');
    $rectorConfig->paths([
        __DIR__ . '/src'
    ]);
};
