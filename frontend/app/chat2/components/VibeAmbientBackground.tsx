'use client'

export function VibeAmbientBackground() {
    return (
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
            <div
                className="absolute inset-0 opacity-90"
                style={{
                    background:
                        'linear-gradient(135deg, #1a1428 0%, #0f172a 38%, #134e4a 100%)',
                }}
            />
            <div
                className="absolute -left-1/4 top-0 h-[70vh] w-[70vw] rounded-full opacity-40 blur-[100px]"
                style={{ background: 'radial-gradient(circle, rgba(139, 92, 246, 0.55) 0%, transparent 65%)' }}
            />
            <div
                className="absolute -right-1/4 bottom-0 h-[60vh] w-[65vw] rounded-full opacity-35 blur-[110px]"
                style={{ background: 'radial-gradient(circle, rgba(45, 212, 191, 0.45) 0%, transparent 60%)' }}
            />
            <div
                className="absolute left-1/2 top-1/2 h-[50vh] w-[50vw] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-25 blur-[90px]"
                style={{ background: 'radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, transparent 55%)' }}
            />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 256 256%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%224%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22 opacity=%220.04%22/%3E%3C/svg%3E')] opacity-30" />
        </div>
    )
}
