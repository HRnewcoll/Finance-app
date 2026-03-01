package main

import (
	"fmt"
	"net"
	"os"
	"os/signal"
	"syscall"

	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
	"github.com/spf13/viper"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"

	pb "{{MODULE_PATH}}/api"
	"{{MODULE_PATH}}/internal/handler"
)

func main() {
	// Configure structured logging
	zerolog.TimeFieldFormat = zerolog.TimeFormatUnix
	if os.Getenv("ENV") != "production" {
		log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr})
	}

	// Load configuration
	viper.SetConfigName("config")
	viper.SetConfigType("yaml")
	viper.AddConfigPath(".")
	viper.AddConfigPath("./config")
	viper.AutomaticEnv()
	viper.SetDefault("grpc.port", 50051)

	if err := viper.ReadInConfig(); err != nil {
		log.Warn().Err(err).Msg("no config file found, using defaults and env vars")
	}

	port := viper.GetInt("grpc.port")
	addr := fmt.Sprintf(":%d", port)

	// Start gRPC server
	lis, err := net.Listen("tcp", addr)
	if err != nil {
		log.Fatal().Err(err).Str("addr", addr).Msg("failed to listen")
	}

	grpcServer := grpc.NewServer()
	pb.Register{{SERVICE_NAME_PASCAL}}ServiceServer(grpcServer, handler.New{{SERVICE_NAME_PASCAL}}Handler())
	reflection.Register(grpcServer) // Enable gRPC reflection for debugging

	log.Info().Str("addr", addr).Msg("{{SERVICE_NAME}} gRPC server starting")

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		if err := grpcServer.Serve(lis); err != nil {
			log.Fatal().Err(err).Msg("gRPC server failed")
		}
	}()

	<-quit
	log.Info().Msg("shutting down {{SERVICE_NAME}} gracefully…")
	grpcServer.GracefulStop()
	log.Info().Msg("{{SERVICE_NAME}} stopped")
}
