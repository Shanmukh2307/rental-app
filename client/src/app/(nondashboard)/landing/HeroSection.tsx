"use client"
import Image from 'next/image'
import React from 'react'
import { motion } from 'framer-motion'
import {Input} from '@/components/ui/input'
import {Button} from '@/components/ui/button'
const HeroSection = () => {
  return (
    <div className='relative h-screen'>
        <Image
            src="/landing-splash.jpg"
            alt="Rentiful Rental Platform Hero Section"
            fill 
            className='object-cover object-center'
            priority
        />
        <div className="absolute inset-0 bg-black bg-opacity-60"></div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8}}
          className='absolute top-1/3 transform -translate-y-1/2  -translate-x-1/2 text-center w-full'
        >
           <div className="max-w-4xl mx-auto px-16 sm:px-12">
              <h1 className="text-5xl font-bold text-white mb-4">
                Start your journey to finding the perfect place to call home
              </h1>
              <p className="text-xl text-white mb-8">
                Explore our wide range of rental properties tailored to your lifestyle and needs!
              </p>
              <div className="flex justify-center">
                <Input
                  type="text"
                  value="search query"
                  onChange={() => {}}
                  placeholder="search by city,neighbourhood, or address"
                  className="w-full max-w-lg rounded-none rounded-l-xl border-none bg-white h-12"
                />
                <Button
                   onClick={() => {}}
                   className="bg-secondary-500 text-white rounded-none rounded-r-xl border-none h-12 hover:bg-secondary-600"               
                >
                    Search
                </Button>
              </div>
           </div>
        </motion.div>
    </div>
  )
}

export default HeroSection