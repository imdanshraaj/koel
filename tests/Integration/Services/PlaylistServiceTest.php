<?php

namespace Tests\Integration\Services;

use App\Models\Playlist;
use App\Models\PlaylistFolder;
use App\Models\Song;
use App\Services\PlaylistService;
use App\Values\SmartPlaylistRuleGroupCollection;
use Illuminate\Support\Collection;
use InvalidArgumentException as BaseInvalidArgumentException;
use Tests\TestCase;
use Webmozart\Assert\InvalidArgumentException;

use function Tests\create_user;

class PlaylistServiceTest extends TestCase
{
    private PlaylistService $service;

    public function setUp(): void
    {
        parent::setUp();

        $this->service = app(PlaylistService::class);
    }

    public function testCreatePlaylist(): void
    {
        $user = create_user();

        $playlist = $this->service->createPlaylist('foo', $user);

        self::assertSame('foo', $playlist->name);
        self::assertTrue($user->is($playlist->user));
        self::assertFalse($playlist->is_smart);
    }

    public function testCreatePlaylistWithSongs(): void
    {
        /** @var array<array-key, Song>|Collection $songs */
        $songs = Song::factory(3)->create();

        $user = create_user();

        $playlist = $this->service->createPlaylist('foo', $user, null, $songs->pluck('id')->all());

        self::assertSame('foo', $playlist->name);
        self::assertTrue($user->is($playlist->user));
        self::assertFalse($playlist->is_smart);
        self::assertEqualsCanonicalizing($playlist->songs->pluck('id')->all(), $songs->pluck('id')->all());
    }

    public function testCreateSmartPlaylist(): void
    {
        $rules = SmartPlaylistRuleGroupCollection::create([
            [
                'id' => '45368b8f-fec8-4b72-b826-6b295af0da65',
                'rules' => [
                    [
                        'id' => '8cfa8700-fbc0-4078-b175-af31c20a3582',
                        'model' => 'title',
                        'operator' => 'is',
                        'value' => ['foo'],
                    ],
                ],
            ],
        ]);

        $user = create_user();

        $playlist = $this->service->createPlaylist('foo', $user, null, [], $rules);

        self::assertSame('foo', $playlist->name);
        self::assertTrue($user->is($playlist->user));
        self::assertTrue($playlist->is_smart);
    }

    public function testCreatePlaylistInFolder(): void
    {
        /** @var PlaylistFolder $folder */
        $folder = PlaylistFolder::factory()->create();

        $playlist = $this->service->createPlaylist('foo', $folder->user, $folder);

        self::assertSame('foo', $playlist->name);
        self::assertTrue($folder->user->is($playlist->user));
        self::assertTrue($folder->is($playlist->folder));
    }

    public function testCreatePlaylistInAnotherUsersFolder(): void
    {
        /** @var PlaylistFolder $folder */
        $folder = PlaylistFolder::factory()->create();

        self::expectException(InvalidArgumentException::class);

        $this->service->createPlaylist('foo', create_user(), $folder);
    }

    public function testUpdateSimplePlaylist(): void
    {
        /** @var Playlist $playlist */
        $playlist = Playlist::factory()->create(['name' => 'foo']);

        $this->service->updatePlaylist($playlist, 'bar');

        self::assertSame('bar', $playlist->name);
    }

    public function testUpdateSmartPlaylist(): void
    {
        $rules = SmartPlaylistRuleGroupCollection::create([
            [
                'id' => '45368b8f-fec8-4b72-b826-6b295af0da65',
                'rules' => [
                    [
                        'id' => '8cfa8700-fbc0-4078-b175-af31c20a3582',
                        'model' => 'title',
                        'operator' => 'is',
                        'value' => ['foo'],
                    ],
                ],
            ],
        ]);

        /** @var Playlist $playlist */
        $playlist = Playlist::factory()->create(['name' => 'foo', 'rules' => $rules]);

        $this->service->updatePlaylist($playlist, 'bar', null, SmartPlaylistRuleGroupCollection::create([
            [
                'id' => '45368b8f-fec8-4b72-b826-6b295af0da65',
                'rules' => [
                    [
                        'id' => '8cfa8700-fbc0-4078-b175-af31c20a3582',
                        'model' => 'title',
                        'operator' => 'is',
                        'value' => ['bar'],
                    ],
                ],
            ],
        ]));

        $playlist->refresh();

        self::assertSame('bar', $playlist->name);
        self::assertTrue($playlist->is_smart);
        self::assertSame($playlist->rule_groups->first()->rules->first()->value, ['bar']);
    }

    public function testSettingOwnsSongOnlyFailsForCommunityLicenseWhenCreate(): void
    {
        self::expectException(BaseInvalidArgumentException::class);
        self::expectExceptionMessage('"Own songs only" option only works with smart playlists and Plus license.');

        $this->service->createPlaylist(
            name: 'foo',
            user: create_user(),
            ruleGroups: SmartPlaylistRuleGroupCollection::create([
                [
                    'id' => '45368b8f-fec8-4b72-b826-6b295af0da65',
                    'rules' => [
                        [
                            'id' => '8cfa8700-fbc0-4078-b175-af31c20a3582',
                            'model' => 'title',
                            'operator' => 'is',
                            'value' => ['foo'],
                        ],
                    ],
                ],
            ]),
            ownSongsOnly: true
        );
    }

    public function testSettingOwnsSongOnlyFailsForCommunityLicenseWhenUpdate(): void
    {
        self::expectException(BaseInvalidArgumentException::class);
        self::expectExceptionMessage('"Own songs only" option only works with smart playlists and Plus license.');

        /** @var Playlist $playlist */
        $playlist = Playlist::factory()->smart()->create();

        $this->service->updatePlaylist(
            playlist: $playlist,
            name: 'foo',
            ownSongsOnly: true
        );
    }
}
