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

use Fisharebest\Webtrees\Auth;
use Fisharebest\Webtrees\Clock\SystemClock;
use Fisharebest\Webtrees\Contracts\UserInterface;
use Fisharebest\Webtrees\DB;
use Fisharebest\Webtrees\Family;
use Fisharebest\Webtrees\Individual;
use Fisharebest\Webtrees\Module\AbstractIndividualListModule;
use Fisharebest\Webtrees\Module\FamilyListModule;
use Fisharebest\Webtrees\Module\IndividualListModule;
use Fisharebest\Webtrees\Services\UserService;
use Fisharebest\Webtrees\Tests\TestCase;
use Fisharebest\Webtrees\Tree;
use Illuminate\Support\Collection;
use PHPUnit\Framework\Attributes\CoversClass;
use ReflectionMethod;

use function array_count_values;
use function array_unique;

/**
 * UI-002: the complete individual list includes people with a blank or
 * unknown surname, once each; the A-Z (surname) views are unchanged.
 * Uses the fictional sample tree tests/data/demo.ged.
 */
#[CoversClass(AbstractIndividualListModule::class)]
class CompleteIndividualListTest extends TestCase
{
    private Tree $tree;

    protected function setUp(): void
    {
        parent::setUp();

        self::createDatabase();

        $user = (new UserService(new SystemClock()))->create('user', 'User', 'user@example.com', 'secret');
        $user->setPreference(UserInterface::PREF_IS_ADMINISTRATOR, '1');
        Auth::login($user);

        $this->tree = $this->importTree('demo.ged');
    }

    public function testCompleteListIncludesBlankAndUnknownSurnames(): void
    {
        $listed = $this->xrefs($this->individuals([]));

        foreach (['' => 'blank', '@N.N.' => 'unknown'] as $surname => $label) {
            $expected = $this->xrefsWithSurname($surname);

            self::assertNotSame([], $expected, 'demo.ged has individuals with a ' . $label . ' surname');

            foreach ($expected as $xref) {
                self::assertContains($xref, $listed, $label . ' surname: ' . $xref);
            }
        }
    }

    public function testCompleteListHasOneRowPerIndividual(): void
    {
        $listed = $this->xrefs($this->individuals([]));

        self::assertSame([], array_keys(array_filter(array_count_values($listed), static fn (int $n): bool => $n > 1)));

        // Everyone with a (non-married) name is listed.
        $with_names = DB::table('name')
            ->where('n_file', '=', $this->tree->id())
            ->where('n_type', '<>', '_MARNM')
            ->distinct()
            ->pluck('n_id')
            ->all();

        self::assertEqualsCanonicalizing($with_names, $listed);
    }

    public function testSurnameViewsAreUnchanged(): void
    {
        // A-Z "unknown surname" and "no surname" views list only those people, as before.
        self::assertEqualsCanonicalizing($this->xrefsWithSurname('@N.N.'), array_unique($this->xrefs($this->individuals(['@N.N.']))));
        self::assertEqualsCanonicalizing($this->xrefsWithSurname(''), array_unique($this->xrefs($this->individuals(['']))));
    }

    public function testCompleteFamilyListIncludesSpousesWithoutSurname(): void
    {
        $method   = new ReflectionMethod(FamilyListModule::class, 'families');
        $families = $method->invoke(new FamilyListModule(), $this->tree, [], '', false);
        $listed   = $families->map(static fn (Family $family): string => $family->xref())->values()->all();

        // In demo.ged, X1082 ("1 NAME //") is a spouse in family f22.
        self::assertContains('f22', $listed);
        self::assertSame($listed, array_values(array_unique($listed)));
    }

    /**
     * @param array<string> $surnames
     *
     * @return Collection<int,Individual>
     */
    private function individuals(array $surnames): Collection
    {
        $method = new ReflectionMethod(IndividualListModule::class, 'individuals');

        return $method->invoke(new IndividualListModule(), $this->tree, $surnames, '', false, false);
    }

    /**
     * @param Collection<int,Individual> $individuals
     *
     * @return array<int,string>
     */
    private function xrefs(Collection $individuals): array
    {
        return $individuals->map(static fn (Individual $individual): string => $individual->xref())->values()->all();
    }

    /**
     * @return array<int,string>
     */
    private function xrefsWithSurname(string $surname): array
    {
        return DB::table('name')
            ->where('n_file', '=', $this->tree->id())
            ->where('n_type', '<>', '_MARNM')
            ->where('n_surn', '=', $surname)
            ->distinct()
            ->pluck('n_id')
            ->all();
    }
}
