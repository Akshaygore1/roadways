import { MUSIC_PLAYLISTS } from '../config';
import type { MusicMoodId, MusicPlaylist } from '../config';

const SPOTIFY_BASE_URL = 'https://open.spotify.com';

export class MusicPlayer {
  private readonly root: HTMLElement;
  private readonly toggleButton: HTMLButtonElement;
  private readonly panel: HTMLElement;
  private readonly iframe: HTMLIFrameElement;
  private readonly currentMood: HTMLElement;
  private readonly fallbackLink: HTMLAnchorElement;
  private readonly moodButtons: HTMLButtonElement[];
  private selectedMood: MusicPlaylist = MUSIC_PLAYLISTS[0];

  constructor() {
    this.root = this.getElement<HTMLElement>('music-player');
    this.toggleButton = this.getElement<HTMLButtonElement>('music-player-toggle');
    this.panel = this.getElement<HTMLElement>('music-player-panel');
    this.iframe = this.getElement<HTMLIFrameElement>('music-player-embed');
    this.currentMood = this.getElement<HTMLElement>('music-player-current');
    this.fallbackLink = this.getElement<HTMLAnchorElement>('music-player-fallback');
    this.moodButtons = Array.from(
      this.root.querySelectorAll<HTMLButtonElement>('[data-music-mood]')
    );

    this.bindEvents();
    this.selectMood(this.selectedMood.id);
  }

  private bindEvents(): void {
    this.toggleButton.addEventListener('click', () => {
      this.setExpanded(!this.root.classList.contains('is-expanded'));
    });

    this.moodButtons.forEach((button, index) => {
      button.addEventListener('click', () => {
        this.selectMood(button.dataset.musicMood as MusicMoodId);
      });

      button.addEventListener('keydown', (event) => {
        const lastIndex = this.moodButtons.length - 1;
        let nextIndex: number | null = null;

        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          nextIndex = index === lastIndex ? 0 : index + 1;
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          nextIndex = index === 0 ? lastIndex : index - 1;
        } else if (event.key === 'Home') {
          nextIndex = 0;
        } else if (event.key === 'End') {
          nextIndex = lastIndex;
        }

        if (nextIndex !== null) {
          event.preventDefault();
          const nextButton = this.moodButtons[nextIndex];
          this.selectMood(nextButton.dataset.musicMood as MusicMoodId);
          nextButton.focus();
        }
      });
    });

    ['keydown', 'keyup'].forEach((type) => {
      this.root.addEventListener(type, (event) => {
        if (event instanceof KeyboardEvent && this.isMusicControlKey(event)) {
          event.stopPropagation();
        }
      });
    });

    // Keep pointer gestures inside the radio from moving the game camera.
    ['pointerdown', 'pointermove', 'pointerup', 'wheel'].forEach((type) => {
      this.root.addEventListener(type, (event) => event.stopPropagation());
    });

    window.addEventListener('blur', () => {
      window.setTimeout(() => this.restoreGameFocus(), 0);
    });
  }

  private isMusicControlKey(event: KeyboardEvent): boolean {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    const focusedControl = target.closest<HTMLButtonElement | HTMLAnchorElement>('button, a');
    if (!focusedControl || !this.root.contains(focusedControl)) {
      return false;
    }

    if (event.key === 'Enter' || event.code === 'Space') {
      return true;
    }

    const isMoodButton = focusedControl.matches('[data-music-mood]');
    return isMoodButton && [
      'ArrowUp',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'Home',
      'End'
    ].includes(event.key);
  }

  private restoreGameFocus(): void {
    if (document.activeElement !== this.iframe) {
      return;
    }

    this.iframe.blur();
    window.focus();
  }

  private setExpanded(expanded: boolean): void {
    this.root.classList.toggle('is-expanded', expanded);
    this.toggleButton.setAttribute('aria-expanded', expanded.toString());
    this.toggleButton.setAttribute(
      'aria-label',
      `${expanded ? 'Close' : 'Open'} DESI FM, ${this.selectedMood.label} selected`
    );
    this.panel.hidden = !expanded;
  }

  private selectMood(moodId: MusicMoodId): void {
    const playlist = MUSIC_PLAYLISTS.find((item) => item.id === moodId);
    if (!playlist) {
      return;
    }

    const hasChanged = this.selectedMood.id !== playlist.id;
    this.selectedMood = playlist;
    const spotifyUrl = `${SPOTIFY_BASE_URL}/playlist/${playlist.spotifyPlaylistId}`;

    this.currentMood.textContent = playlist.label;
    this.fallbackLink.href = spotifyUrl;
    this.fallbackLink.setAttribute('aria-label', `Open ${playlist.label} playlist in Spotify`);
    this.toggleButton.setAttribute(
      'aria-label',
      `${this.root.classList.contains('is-expanded') ? 'Close' : 'Open'} DESI FM, ${playlist.label} selected`
    );
    const moodIndex = MUSIC_PLAYLISTS.indexOf(playlist);
    const tunerPosition = ((moodIndex + 0.5) / MUSIC_PLAYLISTS.length) * 100;
    this.root.style.setProperty('--music-tuner-position', `${tunerPosition}%`);

    this.moodButtons.forEach((button) => {
      const selected = button.dataset.musicMood === playlist.id;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-selected', selected.toString());
      button.tabIndex = selected ? 0 : -1;
    });

    if (hasChanged || !this.iframe.hasAttribute('src')) {
      this.iframe.src = `${SPOTIFY_BASE_URL}/embed/playlist/${playlist.spotifyPlaylistId}?utm_source=generator&theme=0`;
      this.iframe.title = `Spotify player: ${playlist.label}`;
    }
  }

  private getElement<T extends HTMLElement>(id: string): T {
    const element = document.getElementById(id);
    if (!element) {
      throw new Error(`Missing music player element: #${id}`);
    }
    return element as T;
  }
}
