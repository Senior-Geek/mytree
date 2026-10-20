<?php

/**
 * MyTree: a maintained fork of webtrees: online genealogy
 * Copyright (C) 2026 webtrees development team and MyTree contributors
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

declare(strict_types=1);

namespace Fisharebest\Webtrees\MyTree;

use Fisharebest\Webtrees\Http\Controllers\CheckForNewVersionNow;
use Fisharebest\Webtrees\Http\Controllers\UpgradeWizard;
use Fisharebest\Webtrees\Http\Controllers\UpgradeWizardStep;
use Fisharebest\Webtrees\Http\Exceptions\HttpNotFoundException;
use Fisharebest\Webtrees\Http\Routing\RouteCollection;
use Fisharebest\Webtrees\Registry;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;

/**
 * MyTree (UI-001): make the webtrees upgrade routes unreachable.
 *
 * Runs after LoadRoutes (see Webtrees::MIDDLEWARE). Re-registers the upgrade
 * wizard, its action and "check now" at their usual URLs with a single route
 * middleware that answers 404 for every user, administrators included,
 * before any controller or permission check runs. WebRoutes stays unchanged,
 * so upstream merges of it are unaffected; the URLs still exist for route(),
 * which keeps any leftover link from failing to render.
 */
final class DisableUpgrades implements MiddlewareInterface
{
    /** Controllers of the upgrade mechanism's routes. */
    public const array CONTROLLERS = [
        UpgradeWizard::class,
        UpgradeWizardStep::class,
        CheckForNewVersionNow::class,
    ];

    public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
    {
        $routes = Registry::container()->get(RouteCollection::class);

        foreach (self::CONTROLLERS as $controller) {
            if ($routes->has($controller)) {
                $routes->add($routes->get($controller)->url, $controller, [self::refuse()]);
            }
        }

        return $handler->handle($request);
    }

    /**
     * Route middleware that refuses the request.
     */
    public static function refuse(): MiddlewareInterface
    {
        return new class () implements MiddlewareInterface {
            public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
            {
                throw new HttpNotFoundException();
            }
        };
    }
}
