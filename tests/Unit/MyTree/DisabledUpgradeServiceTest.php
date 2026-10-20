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

use Fisharebest\Webtrees\Clock\SystemClock;
use Fisharebest\Webtrees\MyTree\DisabledUpgradeService;
use Fisharebest\Webtrees\Services\TimeoutService;
use Fisharebest\Webtrees\Tests\TestCase;
use Illuminate\Support\Collection;
use League\Flysystem\FilesystemOperator;
use PHPUnit\Framework\Attributes\CoversClass;
use Psr\Http\Client\ClientExceptionInterface;
use Psr\Http\Message\RequestFactoryInterface;
use Psr\Http\Message\RequestInterface;
use RuntimeException;

/**
 * UI-001: the webtrees upgrade mechanism is disabled - no version checks, no
 * downloads, no file changes.
 */
#[CoversClass(DisabledUpgradeService::class)]
class DisabledUpgradeServiceTest extends TestCase
{
    public function testNeverReportsAnUpgrade(): void
    {
        $service = $this->service(self::createStub(RequestFactoryInterface::class));

        self::assertFalse($service->isUpgradeAvailable());
        self::assertFalse($service->isUpgradeAvailable(true));
        self::assertSame('', $service->latestVersion());
        self::assertSame('', $service->latestVersionError());
        self::assertSame('', $service->downloadUrl());
    }

    public function testVersionChecksNeverBuildARequest(): void
    {
        // Every upstream version check starts by creating the HTTP request.
        $request_factory = $this->createMock(RequestFactoryInterface::class);
        $request_factory->expects(self::never())->method('createRequest');

        $service = $this->service($request_factory);

        self::assertFalse($service->isUpgradeAvailable());
        self::assertFalse($service->isUpgradeAvailable(true));
        self::assertSame('', $service->latestVersion());
        self::assertSame('', $service->downloadUrl());
    }

    public function testTheHttpClientRefusesEveryRequest(): void
    {
        $this->expectException(ClientExceptionInterface::class);
        $this->expectExceptionMessage(DisabledUpgradeService::MESSAGE);

        DisabledUpgradeService::refusingHttpClient()->sendRequest(self::createStub(RequestInterface::class));
    }

    public function testRefusesToDownload(): void
    {
        $this->expectRefusal();
        $this->service()->downloadFile('https://example.com/webtrees.zip', $this->untouchedFilesystem(), 'webtrees.zip');
    }

    public function testRefusesToExtract(): void
    {
        $this->expectRefusal();
        $this->service()->extractWebtreesZip('webtrees.zip', 'folder');
    }

    public function testRefusesToReadAnArchive(): void
    {
        $this->expectRefusal();
        $this->service()->webtreesZipContents('webtrees.zip');
    }

    public function testRefusesToMoveFiles(): void
    {
        $this->expectRefusal();
        $this->service()->moveFiles($this->untouchedFilesystem(), $this->untouchedFilesystem());
    }

    public function testRefusesToDeleteFiles(): void
    {
        $this->expectRefusal();
        $this->service()->cleanFiles($this->untouchedFilesystem(), new Collection(['app']), new Collection([]));
    }

    private function service(RequestFactoryInterface|null $request_factory = null): DisabledUpgradeService
    {
        return new DisabledUpgradeService(
            $request_factory ?? self::createStub(RequestFactoryInterface::class),
            self::createStub(TimeoutService::class),
            new SystemClock(),
        );
    }

    private function untouchedFilesystem(): FilesystemOperator
    {
        $filesystem = $this->createMock(FilesystemOperator::class);
        $filesystem->expects(self::never())->method(self::anything());

        return $filesystem;
    }

    private function expectRefusal(): void
    {
        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage(DisabledUpgradeService::MESSAGE);
    }
}
