
"use client";

import { motion } from "framer-motion";

export default function Hero() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black">

      {/* PNG BACKGROUND */}
      <div className="absolute inset-0">
        <img
          src="/chai-tapri.png"
          alt="Chai Tapri"
          className="
            h-full
            w-full
            object-cover
            opacity-80
          "
        />

        {/* DARK OVERLAY */}
        <div className="absolute inset-0 bg-black/50" />

        {/* ORANGE GLOW */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,140,0,0.18),transparent_60%)]" />
      </div>

      {/* CONTENT */}
      <motion.div
        initial={{
          opacity: 0,
          y: 40,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 1,
        }}
        className="
          relative
          z-10
          px-6
          text-center
        "
      >
        <p className="
          mb-4
          text-xs
          uppercase
          tracking-[0.5em]
          text-orange-400
          sm:text-sm
        ">
          Welcome to
        </p>

        <h1 className="
          text-6xl
          font-black
          tracking-tight
          sm:text-8xl
          md:text-9xl
        ">
          CHAI
          <span className="text-orange-500">
            {" "}TAPRI
          </span>
        </h1>

        <p className="
          mx-auto
          mt-6
          max-w-xl
          text-sm
          leading-7
          text-white/70
          sm:text-base
        ">
          Cutting chai. Roadside chaos.
          <br />
          Horns, conversations and late-night vibes.
        </p>

        <div className="
          mx-auto
          mt-8
          h-px
          w-24
          bg-orange-500
        " />

        <p className="
          mt-5
          text-xs
          uppercase
          tracking-[0.35em]
          text-white/40
        ">
          Sip • Chill • Repeat
        </p>
      </motion.div>

    </section>
  );
}
