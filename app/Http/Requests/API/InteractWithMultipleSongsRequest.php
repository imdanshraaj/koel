<?php

namespace App\Http\Requests\API;

use App\Models\Song;
use Illuminate\Validation\Rule;

/**
 * @property array<string> $songs
 */
class InteractWithMultipleSongsRequest extends Request
{
    /** @return array<mixed> */
    public function rules(): array
    {
        return [
            'songs' => ['required', 'array', Rule::exists(Song::class, 'id')],
        ];
    }
}
