---
layout: default
title: "KEN's Atelier"
---

<style>
  /* 1. 전체 스크롤 허용 및 배경 고정 */
  body {
    overflow-y: auto !important; /* 스크롤 가능하게 변경 */
    overflow-x: hidden;
  }

  /* 2. 공통 섹션 스타일 (한 화면씩 차지하도록) */
  .section {
    min-height: 100vh; /* 화면 높이만큼 꽉 채움 */
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 60px 20px;
    box-sizing: border-box;
    position: relative;
  }

  /* --- [섹션 1] 메인 대문 (기존 유지) --- */
  .landing-section {
    text-align: center;
    padding-top: 100px; /* 상단바 높이 고려 */
  }

  /* --- [섹션 2] 철학 (민트로켓 스타일) --- */
  .philosophy-section {
    background: rgba(0, 0, 0, 0.6); /* 배경 살짝 어둡게 해서 글자 강조 */
    backdrop-filter: blur(5px); /* 배경 흐림 효과 (고급짐) */
  }

  .philosophy-container {
    display: flex;
    flex-direction: row; /* 가로 배치 */
    max-width: 1200px;
    width: 100%;
    align-items: center;
    justify-content: space-between;
    gap: 50px; /* 글자와 사진 사이 간격 */
  }

  /* 왼쪽: 텍스트 영역 */
  .text-side {
    flex: 1; /* 공간 1 차지 */
    text-align: left;
    color: #e0d1b1; /* 양피지색 */
  }

  .text-side h2 {
    font-size: 3rem;
    margin-bottom: 20px;
    font-weight: 800;
    color: #ffffff;
    line-height: 1.2;
  }

  .text-side h2 span {
    color: #e0d1b1; /* 포인트 컬러 */
  }

  .text-side p {
    font-size: 1.1rem;
    line-height: 1.8;
    color: #ccc;
    font-weight: 300;
  }

  /* 오른쪽: 이미지 영역 */
  .image-side {
    flex: 1; /* 공간 1 차지 */
    display: flex;
    justify-content: center;
  }

  .image-card {
    width: 100%;
    max-width: 500px;
    border-radius: 20px; /* 둥근 모서리 */
    overflow: hidden;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    border: 1px solid rgba(224, 209, 177, 0.3); /* 은은한 테두리 */
    transition: transform 0.3s ease;
  }

  .image-card:hover {
    transform: translateY(-10px); /* 호버 시 살짝 떠오름 */
  }

  .image-card img {
    width: 100%;
    height: auto;
    display: block;
  }

  /* --- [섹션 3] 게임 리스트 (준비중) --- */
  .games-section {
    background: rgba(20, 15, 10, 0.9); /* 더 어두운 배경 */
  }
  
  .games-title {
    font-size: 2.5rem;
    color: #e0d1b1;
    margin-bottom: 50px;
    text-transform: uppercase;
    letter-spacing: 5px;
    border-bottom: 2px solid #e0d1b1;
    padding-bottom: 10px;
  }

  /* 모바일 대응 (화면 좁을 때 세로 배치) */
  @media (max-width: 768px) {
    .philosophy-container {
      flex-direction: column; /* 세로 배치로 변경 */
      text-align: center;
    }
    .text-side { text-align: center; }
    .text-side h2 { font-size: 2rem; }
  }
</style>

<div class="section landing-section">
  <img src="{{ '/assets/images/logo.png' | relative_url }}" alt="KEN's Atelier" class="pixel-logo" style="width: 320px; image-rendering: pixelated; filter: drop-shadow(0 0 15px rgba(0,0,0,0.8)); margin-bottom: 20px;">
  
  <p class="atelier-quote" style="color: #ffffff; font-size: 1.2rem; letter-spacing: 0.3em; text-transform: uppercase; text-shadow: 2px 2px 10px rgba(0,0,0,1); margin-bottom: 40px;">Crafting the Games I Love</p>
  
  <a href="#philosophy" class="enter-button" style="padding: 15px 45px; border: 2px solid #e0d1b1; color: #e0d1b1; background: rgba(61, 43, 31, 0.7); text-decoration: none; font-weight: bold;">EXPLORE ATELIER</a>
</div>

<div id="philosophy" class="section philosophy-section">
  <div class="philosophy-container">
    
    <div class="text-side">
      <h2>내가 사랑할 게임을<br><span>내 손으로</span></h2>
      <p>
        내가 사랑하고 싶은 게임을 만들기 위해<br>
        KEN's Atelier는 오늘도 게임을 설계합니다.<br>
      </p>
    </div>

    <div class="image-side">
      <div class="image-card">
        <img src="https://images.unsplash.com/photo-1550745165-9bc0b252726f?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" alt="Development Environment">
      </div>
    </div>

  </div>
</div>

<section class="project-section">
    
    <div class="section-header">
        <h2 class="title">ATELIER PROJECTS</h2>
        <hr class="title-divider">
    </div>

    <div class="project-grid">
        <div class="project-card">
            <div class="card-image">
                <img src="/assets/images/mao_temp.jpg" alt="Project Alpha">
            </div>
            <div class="card-info">
                <p class="date">Dev Started: 2026.01</p>
                <h3>Project Alpha</h3>
            </div>
        </div>

        <div class="project-card">
            <div class="card-image">
                <img src="/assets/images/rinami_temp.jpg" alt="Project Beta">
            </div>
            <div class="card-info">
                <p class="date">Concept Phase</p>
                <h3>Project Beta</h3>
            </div>
        </div>
    </div>

    <div class="view-more-container">
        <button class="btn-view-more">VIEW MORE PROJECTS +</button>
    </div>

</section>

<style>
  /* --- 게임 리스트 스타일 --- */
  
  .games-section {
    background: #111;
    padding: 60px 20px;
    text-align: center;
    display: block !important;
    height: auto !important;
  }

  .games-title {
    font-size: 2.5rem;
    color: #e0d1b1;
    margin-bottom: 60px;
    text-transform: uppercase;
    letter-spacing: 5px;
    font-weight: 800;
  }

  /* 4칸 고정 (왼쪽 정렬 효과) */
  .games-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr); 
    gap: 30px;
    max-width: 1400px;
    margin: 0 auto;
    width: 100%;
  }

  /* 반응형 */
  @media (max-width: 1200px) {
    .games-grid { grid-template-columns: repeat(3, 1fr); }
  }
  @media (max-width: 900px) {
    .games-grid { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 600px) {
    .games-grid { grid-template-columns: 1fr; }
  }

  /* 카드 스타일 */
  .game-card {
    background: transparent;
    text-decoration: none !important;
    display: flex;
    flex-direction: column;
    text-align: left;
    transition: transform 0.3s ease;
    border-radius: 12px;
    overflow: hidden;
  }

  .game-card:hover {
    transform: translateY(-10px);
  }

  .card-thumb {
    width: 100%;
    aspect-ratio: 16 / 9;
    overflow: hidden;
    border-radius: 12px;
    border: 1px solid #3d2b1f;
    margin-bottom: 15px; /* 여백 살짝 줄임 */
    background-color: #000;
  }

  .card-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.5s ease;
  }

  .game-card:hover .card-thumb img {
    transform: scale(1.05);
  }

  .card-info { padding: 0 5px; }
  
  .card-date { 
    font-size: 0.8rem; 
    color: #888; 
    display: block; 
    margin-bottom: 5px; 
    font-family: monospace; 
  }
  
  .card-title { 
    font-size: 1.4rem; 
    color: #fff; 
    margin: 0; 
    font-weight: 700; 
  }
  
  .game-card:hover .card-title { color: #e0d1b1; }
</style>

<footer class="minimal-footer">
    <div class="footer-container">
        <div class="footer-right-group">
            
            <div class="footer-logo">
                KEN's Atelier
            </div>

            <div class="footer-contact">
                <span class="contact-item">+82 10-5761-3222</span>
                <span class="divider">|</span>
                <span class="contact-item">jungminna03@gmail.com</span>
            </div>

        </div>
    </div>
</footer>