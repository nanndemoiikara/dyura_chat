module.exports = function(grunt){
	grunt.initConfig({
		concat : {
			server : {
				src  : ['js/dev/client.js'],
				dest : 'js/dyura_chat.js'
			}
		},
		cssmin : {
			compress : {
				files : {
					'./css/chat.min.css' : ['./css/dev/chat.css']
				}
			}
		},
		uglify : {
			my_target: {
				files: {
					'js/dyura_chat.min.js' : ['js/dyura_chat.js']
				}
			}
		},
		watch : {
			scripts: {
				files : ['js/dev/*.js', 'css/dev/*.css'],
				tasks : ['concat', 'uglify', 'cssmin']
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-cssmin');
	grunt.loadNpmTasks('grunt-contrib-watch');

	grunt.event.on('watch', function(action, file, target) {
		grunt.log.writeln(target + ': ' + file + ' has ' + action);
	});

	grunt.registerTask('default', ['concat', 'cssmin', 'uglify']);
};
