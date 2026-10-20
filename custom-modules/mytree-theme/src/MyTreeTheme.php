<?php

declare(strict_types=1);

namespace MyTree\Theme;

use Fisharebest\Webtrees\I18N;
use Fisharebest\Webtrees\Module\AbstractModule;
use Fisharebest\Webtrees\Module\ModuleCustomInterface;
use Fisharebest\Webtrees\Module\ModuleCustomTrait;
use Fisharebest\Webtrees\Module\ModuleThemeInterface;
use Fisharebest\Webtrees\Module\ModuleThemeTrait;

use function asset;

/**
 * The MyTree theme (UI-001).
 *
 * Keeps the existing grey/blue look by loading the core "webtrees" theme's
 * stylesheet unchanged, then a small override stylesheet that removes the
 * webtrees logo and tidies the header. The header itself (logo, controls)
 * comes from the mytree-identity module, so it is the same in every theme.
 */
class MyTreeTheme extends AbstractModule implements ModuleCustomInterface, ModuleThemeInterface
{
    use ModuleCustomTrait;
    use ModuleThemeTrait;

    public function title(): string
    {
        // A product name: not translated.
        return 'MyTree';
    }

    public function description(): string
    {
        return I18N::translate('The MyTree theme: the familiar webtrees layout and colours under the MyTree name.');
    }

    public function customModuleAuthorName(): string
    {
        return 'MyTree';
    }

    public function customModuleVersion(): string
    {
        return '0.1.0';
    }

    public function resourcesFolder(): string
    {
        return __DIR__ . '/../resources/';
    }

    /**
     * @return array<string>
     */
    public function stylesheets(): array
    {
        return [
            asset('css/webtrees.min.css'),
            $this->assetUrl('css/mytree-theme.css'),
        ];
    }
}
