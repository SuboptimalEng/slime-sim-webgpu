# 🐌 Slime Sim WebGPU

This repository contains the code for my physarum slime mold simulation. I made
it to learn more about WebGPU and compute shaders. It's essentially a recreation
of Sebastian Lague's slime mold project (albiet with fewer features).

Here's a 40-second demo on
[Twitter](https://x.com/SuboptimalEng/status/1873425520106582229),
[Threads](https://www.threads.net/@suboptimaleng/post/DEK9UtZIX5n?hl=en), or
[r/graphicsprogramming](https://www.reddit.com/r/GraphicsProgramming/comments/1hp4kn2/webgpu_typescript_slime_mold_simulation/).
You can also try the playable demo on my website. Just know that WebGPU doesn't
work on all devices so you might get an error screen.

If you prefer a more in-depth video, you can checkout this [5-minute dev log on
YouTube](https://www.youtube.com/watch?v=nBqZOz7AF34) where I showcase an extended demo
and answer the following questions:

- What is WebGPU?
- What are compute shaders?
- What is the graphics pipeline for this slime simulation?
- What happens in each shader pass?

## Setup Guide

```
# Setup Guide (for everyone).
git clone https://github.com/SuboptimalEng/slime-sim-webgpu.git
cd slime-sim-webgpu
npm install
npm run dev

# How to Deploy to GitHub Pages (mainly for me).
# First, go to main.tsx file and enable StrictMode.
npm run build
npm run deploy
# Disable StrictMode before running locally and pushing to GitHub.
```

## Screenshots

<img src="/_screenshots/slime-mold-01.png">
<img src="/_screenshots/slime-mold-02.png">
<img src="/_screenshots/slime-mold-03.png">

## Resources

#### WebGPU

- [WebGPU Fundamentals](https://webgpufundamentals.org/)
- [Google's Game of Life WebGPU Tutorial Series](https://codelabs.developers.google.com/your-first-webgpu-app#0)

#### Slime Mold Simulation

- [Jeff Jones' Physarum Research Paper](https://uwe-repository.worktribe.com/output/980579)
- [Sebastian Lague's Slime Simulation Code](https://github.com/SebLague/Slime-Simulation)
- [Sebastian Lague’s Slime Simulation Video](https://www.youtube.com/watch?v=X-iSQQgOd1A)
- [Simulife Hub's Slime Mold Simulation Video](https://www.youtube.com/watch?v=qryINYcgO1s)
- [Sage Jenson's Physarum Simulation Article](https://cargocollective.com/sagejenson/physarum)

## License

Shield: [![CC BY-NC-SA 4.0][cc-by-nc-sa-shield]][cc-by-nc-sa]

This work is licensed under a
[Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License][cc-by-nc-sa].

[![CC BY-NC-SA 4.0][cc-by-nc-sa-image]][cc-by-nc-sa]

[cc-by-nc-sa]: http://creativecommons.org/licenses/by-nc-sa/4.0/
[cc-by-nc-sa-image]: https://licensebuttons.net/l/by-nc-sa/4.0/88x31.png
[cc-by-nc-sa-shield]: https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg
