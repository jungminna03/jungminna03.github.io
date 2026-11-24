---
title: 'Deadlands : idle defense'
date: 2026-11-24
project: 'Deadlands : idle defense'
period: 2023.03 – 2023.12
cover: ./images/portfolio/deadlands.png
skills: [Unity, C#, ScriptableObject, Unity Ads, Unity IAP]
highlight: Google Play 출시 후 3개월 운영. SO·추상화로 코드를 다 몰라도 새 적·강화를 추가할 수 있게 설계해 후배에게 운영을 넘김
---

![Deadlands : idle defense](./images/portfolio/deadlands.png)

Emotive Play Lab 학부연구생으로 들어가 처음 시작한 프로젝트. 프로그래밍 전반을 맡았고 Google Play에 출시해 3개월간 서비스했다.

## 직접 출시하기

이전 게임의 Steam 출시는 기획자에게 맡겼지만, 이번에는 직접 Google Play에 올렸다. Unity SDK 버전업, 플레이 콘솔 요구사항 충족을 처리했고 Unity Ads·IAP로 BM을 붙였다.

## 운영을 넘겨줄 수 있는 구조

운영을 후배에게 넘길 걸 생각해서 SOLID 원칙을 공부하고, 코드를 다 파악하지 않아도 기획 요구사항을 구현할 수 있게 만들었다.

- **적:** 행동은 모두 같고 이동 속도·모양만 다르다 → SO로 분리했다. SO 하나 만들고 적 생성 팩토리만 손보면 새 적이 추가된다.
- **강화 카드:** 모양·상호작용은 같고 강화 로직만 다르다 → 부모 강화 카드가 강화에 필요한 스탯(체력, 공격력 등)을 인자로 받게 했다. 상속해서 인자만 조정하면 새 강화가 된다.
