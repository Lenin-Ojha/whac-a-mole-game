# Whac-A-Mole

A simple browser-based Whac-A-Mole game built with HTML, CSS, and vanilla JavaScript.

The game has multiple difficulty levels, a score system, combo tracking, different mole types, sound effects, background music, and a custom hammer cursor for desktop.

## Features

* Classic Whac-A-Mole gameplay
* 3 × 3 game grid
* Multiple mole types
* Normal moles
* Golden moles with bonus points
* Bombs that penalize the player
* Score tracking
* Combo system
* Accuracy tracking
* Timer-based rounds
* Difficulty progression
* Increasing game speed
* Start / pause / resume controls
* Reset game option
* Sound effects
* Background music
* Separate FX and music controls
* Custom hammer cursor on desktop
* Responsive layout for smaller screens
* Touch-friendly gameplay
* Game-over screen with final statistics

## How to Play

1. Open the game in a browser.
2. Press **Start**.
3. Moles will appear in different holes.
4. Click a mole before it disappears.
5. Avoid clicking bombs.
6. Golden moles give bonus points.
7. Try to maintain a high combo and accuracy.
8. Finish the round before the timer reaches zero.

## Scoring

Different targets have different effects on the score.

### Normal Mole

Hitting a normal mole increases your score.

### Golden Mole

Golden moles are bonus targets and give more points than normal moles.

### Bomb

Clicking a bomb results in a penalty.

### Miss

Clicking an empty hole counts as a miss and affects the game's accuracy/combo system.

The exact scoring and gameplay values are controlled in `app.js`.

## Difficulty

The game becomes progressively faster as the player progresses.

Difficulty affects factors such as:

* Mole spawn timing
* Mole visibility duration
* Game speed
* Round progression

This keeps the game from becoming repetitive after the first few rounds.

## Controls

### Desktop

* Move the mouse over the game to control the hammer.
* Click to hit a mole.
* Use the buttons at the top of the game to start, pause, reset, and control audio.

### Mobile

The game is designed to work on touch devices as well.

The custom hammer cursor is hidden on smaller screens because there is no mouse pointer on touch devices.

## Audio

The game uses two MP3 files:

```text
assets/
├── music.mp3
└── click.mp3
```

### Background Music

`music.mp3` is used as the game's background music.

The music starts when the game starts and stops when the game is paused or finished.

### Button Click Sound

`click.mp3` is used for interface button clicks such as:

* Start
* Pause
* Reset
* FX toggle
* Music toggle

### Game Sound Effects

Some gameplay sounds are generated directly with the Web Audio API instead of using separate audio files.

These include:

* Mole hit / whack sound
* Miss sound
* Golden mole sound
* Bomb sound
* Level-up sound

This keeps the number of audio files small while allowing the sound effects to be adjusted directly from `app.js`.

## Project Structure

```text
whac-a-mole/
│
├── index.html
├── app.js
├── style.css
│
└── assets/
    ├── music.mp3
    └── click.mp3
```

## Files

### `index.html`

Contains the main structure of the game.

This includes:

* Game header
* Score display
* Timer
* Combo
* Accuracy
* Game board
* Controls
* Game-over information
* Hammer element

### `style.css`

Contains the visual styling for the game.

It handles:

* Game layout
* Colors
* Buttons
* Game holes
* Mole appearance
* Animations
* Hammer cursor
* Responsive behavior
* Mobile layout

### `app.js`

Contains the game logic.

It handles:

* Game state
* Mole spawning
* Scoring
* Combos
* Accuracy
* Timer
* Difficulty
* Input handling
* Audio
* Hammer movement
* Game start/pause/reset
* Round completion

## Audio Setup

The audio files are loaded from the `assets` directory in `app.js`.

The expected paths are:

```text
assets/music.mp3
assets/click.mp3
```

Make sure the filenames and folder names match exactly.

For example:

```js
this.music = new Audio('assets/music.mp3');
this.click = new Audio('assets/click.mp3');
```

If the files are moved or renamed, these paths need to be updated.

## Changing Sound Effects

The generated sound effects are located inside the `AudioEngine` class in `app.js`.

For example, the miss sound is created with:

```js
miss() {
  this.tone(500, .06, 'square', .05, 180);
}
```

The values control the sound's characteristics:

```text
500   → starting frequency
.06   → duration
square → waveform
.05   → volume
180   → ending frequency
```

The waveform can also be changed.

Examples:

```js
'sine'
'triangle'
'square'
'sawtooth'
```

This makes it easy to adjust the sound without replacing an audio file.

## Running Locally

No build tools or dependencies are required.

Clone the repository:

```bash
git clone https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
```

Open the project folder and run it using a local web server.

For example, with VS Code, you can use the **Live Server** extension.

Then open the local address provided by the server in your browser.

A local server is recommended instead of opening `index.html` directly because browsers can restrict some audio and browser features when using the `file://` protocol.

## Browser Support

The game is intended for modern browsers that support:

* JavaScript
* CSS animations
* Pointer Events
* Web Audio API
* HTML5 Audio

Recent versions of Chrome, Edge, Firefox, and Safari should support the main functionality.

## Mobile Support

The layout adapts to smaller screens.

On touch devices:

* The game board remains playable using touch input.
* The desktop hammer cursor is hidden.
* Buttons and game elements resize to fit smaller screens.

## Hosting

The project is a static website, so it can be hosted using services such as GitHub Pages, Netlify, or Vercel.

There is no backend or database required.

For GitHub Pages, push the project to a repository and enable GitHub Pages from the repository's Pages settings.

Make sure the `assets` folder is included when uploading the project.

## Important

The following structure should remain intact:

```text
index.html
app.js
style.css
assets/
    music.mp3
    click.mp3
```

If `music.mp3` or `click.mp3` are missing, the corresponding audio will not play.

## Customization

Most gameplay behavior can be changed directly in `app.js`.

You can customize things such as:

* Starting score
* Round duration
* Mole spawn rate
* Mole visibility time
* Difficulty progression
* Points
* Combo behavior
* Bomb penalties
* Golden mole bonuses
* Sound volume
* Sound pitch
* Hammer animation

Visual changes can be made in `style.css`.

The HTML structure can be changed in `index.html`.

## Tech Stack

* HTML5
* CSS3
* JavaScript
* Web Audio API
* HTML5 Audio

No frameworks or external JavaScript libraries are required.

## License

This project is available for personal and educational use.

No license has been specified for this project.

If you want to use, modify, or redistribute the project, add your preferred license here.

---

## Author

Built as a browser-based Whac-A-Mole game using vanilla HTML, CSS, and JavaScript.
