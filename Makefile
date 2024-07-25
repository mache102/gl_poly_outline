# make && ./starter

CC = g++
CFLAGS = -std=c++17 -Wall -MMD -I../../lib/glad_330/include

LIBS = -L/usr/lib64 -lGL -lX11 -lGLU -lOpenGL -lglfw

CPP_SRCS = $(wildcard ./src/*.cpp)
C_SRCS = ../../lib/glad_330/src/glad.c
OBJS = $(CPP_SRCS:.cpp=.o) $(C_SRCS:.c=.o)
DEPS = $(CPP_SRCS:.cpp=.d) # Dependency files
TARGET = test

all: $(TARGET)

$(TARGET): $(OBJS)
	$(CC) $(CFLAGS) -o $@ $^ $(LIBS)

# Include dependency files for .o files
-include $(DEPS)

# Rule to generate .o and .d files from .cpp files
%.o: %.cpp
	$(CC) $(CFLAGS) -c -o $@ $<
	
clean:
	rm -f $(OBJS) $(TARGET) $(DEPS)