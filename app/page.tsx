'use client';

import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Languages, ArrowRight, ClipboardList, BookOpen } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            YSS Business Tools
          </h1>
          <p className="text-xl text-gray-600">
            Select a tool to get started
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {/* GGMTS Card */}
          <Card 
            className="group hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 hover:border-blue-500"
            onClick={() => router.push('/ggmts')}
          >
            <div className="p-8">
              <div className="flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-6 group-hover:bg-blue-200 transition-colors">
                <Languages className="w-8 h-8 text-blue-600" />
              </div>
              
              <h2 className="text-2xl font-bold mb-3 text-gray-800">
                GGMTS
              </h2>
              
              <p className="text-gray-600 mb-6">
                Global Gateway Multilingual Translation System - Professional translation tool supporting multiple languages with AI assistance
              </p>
              
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">Translation</span>
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">AI-Powered</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="group-hover:translate-x-1 transition-transform"
                >
                  Open <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </Card>

          {/* MOM Card */}
          <Card 
            className="group hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 hover:border-purple-500"
            onClick={() => router.push('/mom')}
          >
            <div className="p-8">
              <div className="flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-6 group-hover:bg-purple-200 transition-colors">
                <FileText className="w-8 h-8 text-purple-600" />
              </div>
              
              <h2 className="text-2xl font-bold mb-3 text-gray-800">
                MOM Manager
              </h2>
              
              <p className="text-gray-600 mb-6">
                Minutes of Meeting management system with multilingual support, task tracking, and comprehensive reporting features
              </p>
              
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">Meeting</span>
                  <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">Tasks</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="group-hover:translate-x-1 transition-transform"
                >
                  Open <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </Card>

          {/* SWGR RFQ Card */}
          <Card 
            className="group hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 hover:border-orange-500"
            onClick={() => router.push('/swgr-rfq')}
          >
            <div className="p-8">
              <div className="flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-6 group-hover:bg-orange-200 transition-colors">
                <ClipboardList className="w-8 h-8 text-orange-600" />
              </div>
              
              <h2 className="text-2xl font-bold mb-3 text-gray-800">
                SWGR RFQ
              </h2>
              
              <p className="text-gray-600 mb-6">
                Switchgear RFQ dynamic form system with customizable fields, real-time validation, and export capabilities
              </p>
              
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-full">Forms</span>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">Dynamic</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="group-hover:translate-x-1 transition-transform"
                >
                  Open <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </Card>

          {/* Factory Dictionary Card */}
          <Card 
            className="group hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 hover:border-green-500"
            onClick={() => router.push('/factory-dictionary')}
          >
            <div className="p-8">
              <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-6 group-hover:bg-green-200 transition-colors">
                <BookOpen className="w-8 h-8 text-green-600" />
              </div>
              
              <h2 className="text-2xl font-bold mb-3 text-gray-800">
                Factory Dictionary
              </h2>
              
              <p className="text-gray-600 mb-6">
                Multilingual factory terms dictionary with safety notes, categories, and pronunciation guides
              </p>
              
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Dictionary</span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">3 Languages</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="group-hover:translate-x-1 transition-transform"
                >
                  Open <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mt-16 text-center">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Quick Actions</h3>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button
              variant="outline"
              onClick={() => router.push('/ggmts')}
              className="hover:bg-blue-50"
            >
              <Languages className="w-4 h-4 mr-2" />
              Start Translation
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/mom')}
              className="hover:bg-purple-50"
            >
              <FileText className="w-4 h-4 mr-2" />
              Create MOM
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/swgr-rfq')}
              className="hover:bg-orange-50"
            >
              <ClipboardList className="w-4 h-4 mr-2" />
              Open RFQ Form
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/factory-dictionary')}
              className="hover:bg-green-50"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Browse Dictionary
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center text-sm text-gray-500">
          <p>© 2024 YSS Business Tools. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}