hadoop \
	jar /home/hadoopuser/hadoop/share/hadoop/tools/lib/hadoop-streaming-2.6.0.jar \
	-mapper "python /home/ec2-user/app/python_header.py /home/ec2-user/app/mapper/$1" \
	-reducer "python /home/ec2-user/app/python_header.py /home/ec2-user/app/reducer/$2" \
	-input "$3" \
	-output "$3_outdir"
