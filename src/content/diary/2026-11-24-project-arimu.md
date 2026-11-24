---
title: Project Arimu
date: 2026-11-24
project: Project Arimu
period: 2025.06 – 2026.03
skills: [Unity, C#, R3, Unity Test Framework, C++, Siv3D, EnTT, ECS]
highlight: R3로 재사용 가능한 FSM 에셋을 만들고, Haare Framework를 테스트하며 에셋 로딩 중 빈 UI가 노출되는 결함을 찾아 수정 제안
---

개인 역량을 키우려고 시작한 프리코네 + 아이마스 콘솔 시리즈 팬게임. 1인 개발.

## Unity 버전

- R3로 재사용 가능한 FSM 코드 에셋을 만들었다. 재사용 가능한 코드가 왜 유용한지 체감했다.
- [Haare Framework](https://github.com/kirihara-unity/HaareFramework) 프로그래머와 협업해 프레임워크를 테스트했다. 쓰면서 찾은 주요 결함(UI가 에셋을 로딩하는 도중 화면에 표시돼 빈 UI가 순간적으로 보이는 문제 등)을 수정 제안했다.
- Unity Test Framework로 TDD를 실제 개발에 적용했고, 레이어를 나눠 개발한다는 게 무슨 뜻인지 알게 됐다.

## Siv3D + EnTT로 다시 만들기

Unity + 객체지향으로 만들다 보니 DI 문제 때문에 다양한 상성을 구현하기 어려웠다. Siv3D + EnTT로 다시 개발하면서 ECS를 익혔다.

- ECS 아키텍처로 게임을 만든다는 게 무엇인지 이해했다.
- ECS와 객체지향의 장단점을 비교할 수 있게 됐다.
- 엔티티 간 상호작용을 더 유연하고 확장성 있게 표현할 수 있게 됐다.
