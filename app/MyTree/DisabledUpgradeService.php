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

use Fisharebest\Webtrees\Services\TimeoutService;
use Fisharebest\Webtrees\Services\UpgradeService;
use Illuminate\Support\Collection;
use League\Flysystem\FilesystemOperator;
use Psr\Clock\ClockInterface;
use Psr\Http\Client\ClientExceptionInterface;
use Psr\Http\Client\ClientInterface;
use Psr\Http\Message\RequestFactoryInterface;
use Psr\Http\Message\RequestInterface;
use Psr\Http\Message\ResponseInterface;
use RuntimeException;

/**
 * MyTree (UI-001): the webtrees upgrade mechanism, disabled.
 *
 * MyTree is a maintained fork, updated deliberately through Git, Composer and
 * Docker - never by downloading an upstream release over itself. Bound in
 * place of UpgradeService (Webtrees::bootstrap()), so every consumer - the
 * control panel, sign-in, the upgrade wizard, the "Check for new version"
 * module - gets this class. It never contacts dev.webtrees.net, never reports
 * an upgrade, and refuses to download, unpack, move or delete files.
 *
 * The parent is given an HTTP client that refuses every request, so even a
 * future upstream method that isn't overridden here cannot reach the network.
 */
final class DisabledUpgradeService extends UpgradeService
{
    public const string MESSAGE = 'The webtrees upgrade mechanism is disabled in MyTree. Update MyTree through its development workflow.';

    public function __construct(
        RequestFactoryInterface $request_factory,
        TimeoutService $timeout_service,
        ClockInterface $clock,
    ) {
        parent::__construct(self::refusingHttpClient(), $request_factory, $timeout_service, $clock);
    }

    public function isUpgradeAvailable(bool $force = false): bool
    {
        return false;
    }

    public function latestVersion(): string
    {
        return '';
    }

    public function latestVersionError(): string
    {
        return '';
    }

    public function downloadUrl(): string
    {
        return '';
    }

    public function downloadFile(string $url, FilesystemOperator $filesystem, string $path): int
    {
        throw new RuntimeException(self::MESSAGE);
    }

    public function extractWebtreesZip(string $zip_file, string $target_folder): void
    {
        throw new RuntimeException(self::MESSAGE);
    }

    /**
     * @return Collection<int,string>
     */
    public function webtreesZipContents(string $zip_file): Collection
    {
        throw new RuntimeException(self::MESSAGE);
    }

    public function moveFiles(FilesystemOperator $source, FilesystemOperator $destination): void
    {
        throw new RuntimeException(self::MESSAGE);
    }

    /**
     * @param Collection<int,string> $folders_to_clean
     * @param Collection<int,string> $files_to_keep
     */
    public function cleanFiles(FilesystemOperator $filesystem, Collection $folders_to_clean, Collection $files_to_keep): void
    {
        throw new RuntimeException(self::MESSAGE);
    }

    /**
     * An HTTP client that refuses every request.
     */
    public static function refusingHttpClient(): ClientInterface
    {
        return new class () implements ClientInterface {
            public function sendRequest(RequestInterface $request): ResponseInterface
            {
                throw new class (DisabledUpgradeService::MESSAGE) extends RuntimeException implements ClientExceptionInterface {
                };
            }
        };
    }
}
