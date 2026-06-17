require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "react-native-wrst"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.license      = package["license"]
  s.author       = { "wrst" => "wrst" }
  s.homepage     = "https://github.com/"
  s.platforms    = { :ios => "13.0" }
  s.source       = { :git => "https://github.com/", :tag => "#{s.version}" }

  s.source_files = "ios/**/*.{h,m,mm,swift}"
  s.frameworks   = "WatchConnectivity"

  s.dependency "React-Core"
end
