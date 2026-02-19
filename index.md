---
layout: default
title: Home
---

<div class="blog-list-container">
    <ul class="post-list">
        {% for post in site.posts %}
        
        <li class="post-item" data-category="{{ post.categories | join: ',' }}">
            <span class="post-date">{{ post.date | date: "%Y-%m-%d" }}</span>
            <a href="{{ post.url | relative_url }}" class="post-link">
                {% if post.categories.size > 0 %}
                <span class="post-category" style="color: var(--point-color); font-weight: bold; margin-right: 8px; font-size: 0.9em;">
                    [{{ post.categories | first }}]
                </span>
                {% endif %}
                
                {{ post.title }}
            </a>
        </li>
        
        {% endfor %}
    </ul>
</div>