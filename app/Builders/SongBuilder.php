<?php

namespace App\Builders;

use App\Facades\License;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Query\JoinClause;
use Webmozart\Assert\Assert;

/**
 * @method self logSql()
 */
class SongBuilder extends Builder
{
    public const SORT_COLUMNS_NORMALIZE_MAP = [
        'title' => 'songs.title',
        'track' => 'songs.track',
        'length' => 'songs.length',
        'created_at' => 'songs.created_at',
        'disc' => 'songs.disc',
        'artist_name' => 'artists.name',
        'album_name' => 'albums.name',
        'podcast_title' => 'podcasts.title',
        'podcast_author' => 'podcasts.author',
    ];

    private const VALID_SORT_COLUMNS = [
        'songs.title',
        'songs.track',
        'songs.length',
        'songs.created_at',
        'artists.name',
        'albums.name',
        'podcasts.title',
        'podcasts.author',
    ];

    public function inDirectory(string $path): self
    {
        // Make sure the path ends with a directory separator.
        $path = rtrim(trim($path), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;

        return $this->where('path', 'LIKE', "$path%");
    }

    public function withMetaFor(User $user, bool $requiresInteractions = false): self
    {
        $joinClosure = static function (JoinClause $join) use ($user): void {
            $join->on('interactions.song_id', 'songs.id')->where('interactions.user_id', $user->id);
        };

        return $this
            ->with('artist', 'album', 'album.artist')
            ->when(
                $requiresInteractions,
                static fn (self $query) => $query->join('interactions', $joinClosure),
                static fn (self $query) => $query->leftJoin('interactions', $joinClosure)
            )
            ->leftJoin('albums', 'songs.album_id', 'albums.id')
            ->leftJoin('artists', 'songs.artist_id', 'artists.id')
            ->distinct('songs.id')
            ->select(
                'songs.*',
                'albums.name',
                'artists.name',
                'interactions.liked',
                'interactions.play_count'
            );
    }

    public function accessibleBy(User $user, bool $withTableName = true): self
    {
        if (License::isCommunity()) {
            // In the Community Edition, all songs are accessible by all users.
            return $this;
        }

        return $this->where(static function (Builder $query) use ($user, $withTableName): void {
            $query->where(($withTableName ? 'songs.' : '') . 'is_public', true)
                ->orWhere(($withTableName ? 'songs.' : '') . 'owner_id', $user->id);
        });
    }

    private function sortByOneColumn(string $column, string $direction): self
    {
        $column = self::normalizeSortColumn($column);

        Assert::oneOf($column, self::VALID_SORT_COLUMNS);
        Assert::oneOf(strtolower($direction), ['asc', 'desc']);

        return $this
            ->orderBy($column, $direction)
            ->when($column === 'artists.name', static fn (self $query) => $query->orderBy('albums.name')
                ->orderBy('songs.disc')
                ->orderBy('songs.track')
                ->orderBy('songs.title'))
            ->when($column === 'albums.name', static fn (self $query) => $query->orderBy('artists.name')
                ->orderBy('songs.disc')
                ->orderBy('songs.track')
                ->orderBy('songs.title'))
            ->when($column === 'track', static fn (self $query) => $query->orderBy('songs.disc')
                ->orderBy('songs.track'));
    }

    public function sort(array $columns, string $direction): self
    {
        $this->leftJoin('podcasts', 'songs.podcast_id', 'podcasts.id');

        foreach ($columns as $column) {
            $this->sortByOneColumn($column, $direction);
        }

        return $this;
    }

    private static function normalizeSortColumn(string $column): string
    {
        return key_exists($column, self::SORT_COLUMNS_NORMALIZE_MAP)
            ? self::SORT_COLUMNS_NORMALIZE_MAP[$column]
            : $column;
    }

    public function storedOnCloud(): self
    {
        return $this->whereNotNull('storage')
            ->where('storage', '!=', '');
    }

    public function onlySongs(): self
    {
        return $this->whereNull('songs.podcast_id');
    }
}
