# 이미지 생성 기능 세팅 가이드

## 전체 흐름

```
사용자 이야기 입력
      ↓
Claude (대화 분석 → 수채화 프롬프트 생성)
      ↓
DALL-E 3 (프롬프트 → 이미지 URL 반환)
      ↓
Supabase Storage (이미지 저장 → 영구 URL)
      ↓
memories 테이블 image_url 업데이트
      ↓
책에서 실제 이미지 표시
```

---

## 1. OpenAI API 키 발급

1. https://platform.openai.com 접속
2. API Keys → Create new secret key
3. `.env.local`에 `OPENAI_API_KEY=sk-...` 추가

### 비용 예상
- DALL-E 3 standard 1024x1024: **$0.04 / 장**
- 기억 카드 저장할 때만 생성 (매 대화마다 X)
- 월 100개 저장 시 약 **$4 / 월**

---

## 2. Supabase Storage 버킷 생성

Supabase Dashboard → SQL Editor에서 실행:

```sql
-- supabase-schema-image.sql 파일 내용 붙여넣기
```

또는 Dashboard → Storage → New bucket:
- Name: `memory-images`
- Public bucket: ✅ (체크)

---

## 3. openai 패키지 설치

```bash
npm install openai
```

---

## 4. 프롬프트 예시

Claude가 생성하는 DALL-E 프롬프트 예시:

**입력 기억:** "그날 나는 처음으로 혼자 된장찌개를 끓였다. 짰지만 뿌듯했다."

**생성 프롬프트:**
```
Soft Korean watercolor illustration of a young woman seen from behind,
standing alone in a small traditional Korean kitchen, stirring a pot
on a gas stove. Warm afternoon light filters through a small window.
Steam rises gently from the pot. The scene feels quiet, tender, and
slightly nostalgic. Muted earth tones, soft peach and sage greens,
delicate watercolor washes with visible paper texture. No text.
```

---

## 5. 이미지 생성 타이밍

현재 구현: **"내 책에 담기" 버튼 클릭 시** 생성
- 사용자 경험: 버튼 누르면 "수채화로 그리는 중..." 로딩 표시
- 약 10~20초 후 완성 이미지 표시
- 실패 시 재시도 버튼 제공

### 대안으로 고려할 수 있는 방식
- 백그라운드에서 미리 생성 (기억 저장 직후 비동기)
- 책을 열 때 lazy generate

---

## 6. 이미지 없을 때 폴백

`BookEntry.tsx`에서 `image_url`이 없거나 로드 실패 시
→ 자동으로 수채화 그라디언트 + 이모지로 폴백 처리됨
