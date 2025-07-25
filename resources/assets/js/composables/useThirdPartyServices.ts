import { toRef } from 'vue'
import { commonStore } from '@/stores/commonStore'

export const useThirdPartyServices = () => {
  return {
    useLastfm: toRef(commonStore.state, 'uses_last_fm'),
    useMusicBrainz: toRef(commonStore.state, 'uses_musicbrainz'),
    useYouTube: toRef(commonStore.state, 'uses_you_tube'),
    useAppleMusic: toRef(commonStore.state, 'uses_i_tunes'),
    useSpotify: toRef(commonStore.state, 'uses_spotify'),
  }
}
