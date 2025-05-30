<template>
  <FooterButton
    :class="droppable && 'droppable'"
    class="queue-btn"
    title="Queue (Q)"
    @click.prevent="showQueue"
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
    @dragenter.prevent="onDragEnter"
    @dragover.prevent
  >
    <Icon :icon="faListOl" fixed-width />
  </FooterButton>
</template>

<script setup lang="ts">
import { faListOl } from '@fortawesome/free-solid-svg-icons'
import { ref } from 'vue'
import { useDroppable } from '@/composables/useDragAndDrop'
import { useRouter } from '@/composables/useRouter'
import { useMessageToaster } from '@/composables/useMessageToaster'
import { queueStore } from '@/stores/queueStore'
import { pluralize } from '@/utils/formatters'

import FooterButton from '@/components/layout/app-footer/FooterButton.vue'

const { go, isCurrentScreen, url } = useRouter()
const { toastWarning, toastSuccess } = useMessageToaster()

const { acceptsDrop, resolveDroppedItems } = useDroppable(
  ['playables', 'album', 'artist', 'playlist', 'playlist-folder', 'browser-media'],
)

const droppable = ref(false)

const onDragEnter = (event: DragEvent) => droppable.value = acceptsDrop(event)
const onDragLeave = (e: DragEvent) => {
  if ((e.currentTarget as Node)?.contains?.(e.relatedTarget as Node)) {
    return
  }

  droppable.value = false
}

const onDrop = async (event: DragEvent) => {
  droppable.value = false

  event.preventDefault()
  const items = await resolveDroppedItems(event) || []

  if (items.length) {
    queueStore.queue(items)
    toastSuccess(`Added ${pluralize(items, 'item')} to queue.`)
  } else {
    toastWarning('No applicable items to queue.')
  }

  return false
}

const showQueue = () => go(isCurrentScreen('Queue') ? -1 : url('queue'))
</script>

<style lang="postcss" scoped>
.droppable {
  @apply text-k-highlight scale-125;
}
</style>
