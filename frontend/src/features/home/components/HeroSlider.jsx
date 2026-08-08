import { useEffect, useState } from "react"
import { useHeroSlidesPublic } from "@/hooks/use-hero-slides-public"
import { resolveMediaUrl } from "@/lib/media"

const AUTOPLAY_INTERVAL_MS = 5000

/** Full-width 8:3 hero slider shown above the product grid on the storefront homepage. */
export function HeroSlider() {
  const { data: slides = [] } = useHeroSlidesPublic()
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  // Clamp back onto a valid slide if the active one disappears (e.g. slides refetch mid-view).
  useEffect(() => {
    if (activeIndex >= slides.length) setActiveIndex(0)
  }, [slides.length, activeIndex])

  useEffect(() => {
    if (isPaused || slides.length <= 1) return undefined
    const timer = setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length)
    }, AUTOPLAY_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [isPaused, slides.length])

  if (slides.length === 0) return null

  function goTo(index) {
    setActiveIndex((index + slides.length) % slides.length)
  }

  return (
    <div
      id="home-hero-slider"
      className="hero-slider position-relative mb-4 rounded overflow-hidden"
      style={{ aspectRatio: "8 / 3" }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {slides.map((slide, index) => (
        <SlideImage key={slide.id} slide={slide} isActive={index === activeIndex} />
      ))}
      <div className="hero-slide-scrim" aria-hidden="true" />

      {slides.length > 1 ? (
        <>
          <button
            type="button"
            id="home-hero-slider-prev"
            className="hero-slider-arrow position-absolute d-flex align-items-center justify-content-center border-0"
            style={{ top: "50%", left: "1rem", transform: "translateY(-50%)", width: 40, height: 40, borderRadius: "50%" }}
            onClick={() => goTo(activeIndex - 1)}
            aria-label="Previous slide"
          >
            <i className="fas fa-chevron-left" />
          </button>
          <button
            type="button"
            id="home-hero-slider-next"
            className="hero-slider-arrow position-absolute d-flex align-items-center justify-content-center border-0"
            style={{ top: "50%", right: "1rem", transform: "translateY(-50%)", width: 40, height: 40, borderRadius: "50%" }}
            onClick={() => goTo(activeIndex + 1)}
            aria-label="Next slide"
          >
            <i className="fas fa-chevron-right" />
          </button>

          <div className="position-absolute d-flex justify-content-center" style={{ bottom: "0.9rem", left: 0, right: 0, gap: "0.5rem" }}>
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                aria-label={`Go to slide ${index + 1}`}
                onClick={() => goTo(index)}
                className={`hero-slider-dot p-0 border-0 rounded-circle ${index === activeIndex ? "active" : ""}`}
                style={{
                  width: 9,
                  height: 9,
                  background: "rgba(255,255,255,0.6)",
                }}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  )
}

function SlideImage({ slide, isActive }) {
  const Wrapper = slide.linkUrl ? "a" : "div"

  return (
    <Wrapper
      href={slide.linkUrl || undefined}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        opacity: isActive ? 1 : 0,
        transition: "opacity 0.6s ease",
        pointerEvents: isActive ? "auto" : "none",
      }}
    >
      <img
        src={resolveMediaUrl(slide.mediaUrl)}
        alt=""
        className="hero-slide-img"
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </Wrapper>
  )
}
