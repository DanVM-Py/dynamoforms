
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useWindowWidth() {
  const [windowWidth, setWindowWidth] = React.useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : MOBILE_BREAKPOINT
  )

  React.useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth)
    }
    
    window.addEventListener("resize", handleResize)
    handleResize()
    
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return windowWidth
}

export function useIsMobile() {
  const windowWidth = useWindowWidth()
  return windowWidth < MOBILE_BREAKPOINT
}
