import { Controller } from 'stimulus'
import StimulusReflex from 'stimulus_reflex'
import hotkeys from 'hotkeys-js'
import LocalTime from 'local-time'
import { gsap } from 'gsap'
import { Draggable } from 'gsap/Draggable'
import { CSSPlugin } from 'gsap/CSSPlugin'
import { InertiaPlugin } from 'gsap/InertiaPlugin'
gsap.registerPlugin(CSSPlugin, Draggable, InertiaPlugin)

export default class extends Controller {
  static targets = ['state', 'list', 'current', 'version', 'knob']

  connect () {
    StimulusReflex.register(this)

    hotkeys('ctrl+z, command+z', () => {
      this.stimulate('BucketListsReflex#restore', false)
    })
    hotkeys('ctrl+y, command+y', () => {
      this.stimulate('BucketListsReflex#restore', true)
    })

    LocalTime.run()

    setTimeout(() => {
      if (this.hasCurrentTarget) this.currentTarget.scrollIntoViewIfNeeded()
    }, 50)

    this.knobTargets.forEach(knob => this.knobber(knob))
  }

  beforeReflex () {
    this.versionTargets.forEach(version => {
      version.disabled = false
      version.firstChild.removeAttribute('data-localized')
    })
  }

  afterReflex () {
    const focusElement = this.element.querySelector('[autofocus]')
    if (focusElement) {
      focusElement.focus()

      // shenanigans to ensure that the cursor is placed at the end of the existing value
      const value = focusElement.value
      focusElement.value = ''
      focusElement.value = value
    }

    if (this.hasCurrentTarget) this.currentTarget.scrollIntoViewIfNeeded()

    this.listTargets.reverse().forEach(element => {
      if (element.classList.contains('hilite')) {
        element.scrollIntoViewIfNeeded()
        this.highlight(element)
      }
    })

    LocalTime.run()
  }

  cancelEdit (event) {
    if (event.type === 'keyup' && !['Escape', 'Esc'].includes(event.key)) return
    this.stimulate('BucketListsReflex#cancel_edit')
  }

  highlight (element) {
    gsap.to(element, {
      keyframes: [
        { duration: 0.2, scale: 1.01, backgroundColor: '#ff9' },
        { duration: 0.6, scale: 1, backgroundColor: '#fff' }
      ]
    })
  }

  knobber (element) {
    const timeline = gsap.timeline({
      repeat: -1,
      onRepeat: () => {
        const r = ~~draggable.rotation
        timeline.repeatDelay(gsap.utils.mapRange(0, 180, 1.0, 0.1, Math.abs(r)))
        if (
          (r < 0 && this.stateTarget.classList.contains('undo')) ||
          (r > 0 && this.stateTarget.classList.contains('redo'))
        ) {
          this.stimulate('BucketListsReflex#restore', r > 0)
        }
      }
    })
    timeline.pause()
    timeline.to({}, { duration: 0.1 })
    const draggable = Draggable.create(element, {
      type: 'rotation',
      inertia: true,
      onDragStart: () => timeline.play(),
      onDragEnd: () => timeline.pause(),
      snap: () => {
        return 0
      }
    })[0].applyBounds({ minRotation: -180, maxRotation: 180 })
  }
}
