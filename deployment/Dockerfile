# Use the busybox image
FROM busybox

# Copy a directory from your host to the container
COPY . /code
WORKDIR /code
RUN npm install && npm run build


# Default command to execute
CMD ["sh"]

# 

