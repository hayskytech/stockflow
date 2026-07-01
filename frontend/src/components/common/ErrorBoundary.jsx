import { Component } from "react"
import { ServerErrorPage } from "@/components/common/error-pages"

export class ErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error("Unhandled UI error:", error, info)
  }

  render() {
    if (this.state.hasError) return <ServerErrorPage />
    return this.props.children
  }
}
