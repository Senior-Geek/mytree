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

namespace Fisharebest\Webtrees\Tests\Unit\MyTree;

use Fisharebest\Webtrees\Http\Controllers\ControlPanel;
use Fisharebest\Webtrees\Http\Exceptions\HttpNotFoundException;
use Fisharebest\Webtrees\Http\Middleware\CheckForNewVersion;
use Fisharebest\Webtrees\Http\Middleware\LoadRoutes;
use Fisharebest\Webtrees\Http\Middleware\Router;
use Fisharebest\Webtrees\Http\Routing\RouteCollection;
use Fisharebest\Webtrees\MyTree\DisabledUpgradeService;
use Fisharebest\Webtrees\MyTree\DisableUpgrades;
use Fisharebest\Webtrees\Registry;
use Fisharebest\Webtrees\Services\UpgradeService;
use Fisharebest\Webtrees\Tests\TestCase;
use Fisharebest\Webtrees\Webtrees;
use PHPUnit\Framework\Attributes\CoversClass;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use ReflectionClassConstant;

use function array_search;

/**
 * UI-001: the upgrade routes are unreachable, and the application is wired so
 * that no version check can run.
 */
#[CoversClass(DisableUpgrades::class)]
class DisableUpgradesTest extends TestCase
{
    public function testUpgradeRoutesOnlyRefuse(): void
    {
        $routes = Registry::container()->get(RouteCollection::class);
        $urls   = [];

        foreach (DisableUpgrades::CONTROLLERS as $controller) {
            self::assertTrue($routes->has($controller), $controller);
            $urls[$controller] = $routes->get($controller)->url;
        }

        $control_panel = $routes->get(ControlPanel::class);

        (new DisableUpgrades())->process(self::createRequest(), $this->handler());

        foreach (DisableUpgrades::CONTROLLERS as $controller) {
            $route = $routes->get($controller);

            // Same URL (so route() still works), but its only middleware refuses.
            self::assertSame($urls[$controller], $route->url);
            self::assertCount(1, $route->middleware);
            self::assertInstanceOf(MiddlewareInterface::class, $route->middleware[0]);
        }

        // Other routes are untouched.
        self::assertSame($control_panel, $routes->get(ControlPanel::class));
    }

    public function testRefusalIsNotFoundForEveryone(): void
    {
        $this->expectException(HttpNotFoundException::class);

        // No user is signed in or needed: the refusal runs before any permission check.
        DisableUpgrades::refuse()->process(self::createRequest(), $this->handler());
    }

    public function testNoVersionCheckMiddlewareAndUpgradeRoutesDisabled(): void
    {
        $middleware = (new ReflectionClassConstant(Webtrees::class, 'MIDDLEWARE'))->getValue();

        self::assertNotContains(CheckForNewVersion::class, $middleware);

        $load_routes = array_search(LoadRoutes::class, $middleware, true);
        $disable     = array_search(DisableUpgrades::class, $middleware, true);
        $router      = array_search(Router::class, $middleware, true);

        self::assertIsInt($disable);
        self::assertGreaterThan($load_routes, $disable);
        self::assertLessThan($router, $disable);
    }

    public function testApplicationUsesTheDisabledUpgradeService(): void
    {
        // TestCase::setUp() ran Webtrees::bootstrap().
        self::assertInstanceOf(DisabledUpgradeService::class, Registry::container()->get(UpgradeService::class));
    }

    private function handler(): RequestHandlerInterface
    {
        $handler = self::createStub(RequestHandlerInterface::class);
        $handler->method('handle')->willReturn(self::createStub(ResponseInterface::class));

        return $handler;
    }
}
