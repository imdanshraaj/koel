import { screen } from '@testing-library/vue'
import { it } from 'vitest'
import UnitTestCase from '@/__tests__/UnitTestCase'
import factory from '@/__tests__/factory'
import { playlistFolderStore } from '@/stores/playlistFolderStore'
import { playlistStore } from '@/stores/playlistStore'
import SidebarPlaylistsSection from './SidebarPlaylistsSection.vue'
import PlaylistSidebarItem from './PlaylistSidebarItem.vue'
import PlaylistFolderSidebarItem from './PlaylistFolderSidebarItem.vue'

new class extends UnitTestCase {
  protected test () {
    it('displays orphan playlists', () => {
      playlistStore.state.playlists = [
        factory.states('orphan')('playlist', { name: 'Foo Playlist' }),
        factory.states('orphan')('playlist', { name: 'Bar Playlist' }),
        factory.states('smart', 'orphan')('playlist', { name: 'Smart Playlist' }),
      ]

      this.renderComponent()

      ;['Favorites', 'Recently Played', 'Foo Playlist', 'Bar Playlist', 'Smart Playlist'].forEach(text => {
        screen.getByText(text)
      })
    })

    it('displays playlist folders', () => {
      playlistFolderStore.state.folders = [
        factory('playlist-folder', { name: 'Foo Folder' }),
        factory('playlist-folder', { name: 'Bar Folder' }),
      ]

      this.renderComponent()
      ;['Foo Folder', 'Bar Folder'].forEach(text => screen.getByText(text))
    })
  }

  private renderComponent () {
    this.render(SidebarPlaylistsSection, {
      global: {
        stubs: {
          PlaylistSidebarItem,
          PlaylistFolderSidebarItem,
        },
      },
    })
  }
}
