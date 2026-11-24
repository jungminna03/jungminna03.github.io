---
title: AI 이미지 생성 서비스
date: 2026-11-24
project: AI 이미지 생성 서비스
period: Emotive Play Lab
skills: [ComfyUI, Tailscale Funnel, OrangeUI]
highlight: 연구실 서버의 ComfyUI를 Tailscale Funnel로 공개하고, OrangeUI에 ComfyUI 앱 모드를 직접 렌더링해 프롬프트 입력의 한계를 보완
---

Emotive Play Lab에서 학과 학생들이 게임 에셋으로 쓸 이미지를 만들 수 있게 연구실 서버의 ComfyUI로 생성 툴을 제공했다.

## 구성

- 로컬 서버를 온라인에 공개하려고 Tailscale Funnel을 썼다.
- 오픈소스 프론트 OrangeUI를 채택하고 다중 작업·분석 기능을 넣었다.
- OrangeUI는 프롬프트 입력이 단순하다는 단점이 있어서, ComfyUI의 앱 모드를 OrangeUI 안에 직접 렌더링해 보완했다.

## 배운 것

로컬 하드웨어 자원으로 서비스를 구축하는 과정을 이해했다.
