---
layout: page
title: Categories
permalink: /categories/
---

<div class="category-archive">
  {% for category in site.categories %}
    <h2 id="{{ category | first | slugify }}" class="category-title">
      {{ category | first }}
    </h2>
    
    <ul class="post-list">
      {% for post in category.last %}
        <li class="post-item">
          <span class="post-date">{{ post.date | date: "%Y-%m-%d" }}</span>
          <a class="post-link" href="{{ post.url | relative_url }}">
            {{ post.title | escape }}
          </a>
        </li>
      {% endfor %}
    </ul>
    <hr class="category-divider">
  {% endfor %}
</div>

<style>
.category-title {
    color: var(--point-color);
    margin-top: 60px;
    border-bottom: 2px solid var(--text-color);
    padding-bottom: 10px;
}
.category-divider {
    border: 0;
    border-top: 1px dashed rgba(85, 66, 61, 0.3);
    margin: 40px 0;
}
</style>